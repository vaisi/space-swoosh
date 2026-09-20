// PlayGamesPlugin.java
// Changes: Explicit Sign in (force) always calls GamesSignInClient.signIn()
// so a tap can open the Play Games sheet. Returns configured + error.
// Friends load still includes playerId, isLocal, and a small JPEG photo.
package com.orbi.spaceswoosh;

import android.app.Activity;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.images.ImageManager;
import com.google.android.gms.games.AnnotatedData;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.Player;
import com.google.android.gms.games.leaderboard.LeaderboardScore;
import com.google.android.gms.games.leaderboard.LeaderboardScoreBuffer;
import com.google.android.gms.games.leaderboard.LeaderboardVariant;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {

    private static final String TAG = "SpaceSwoosh.PlayGames";
    private static final int PHOTO_PX = 64;
    private static final int PHOTO_WAIT_MS = 3500;

    private boolean sdkReady = false;

    @Override
    public void load() {
        ensureSdk();
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        Activity activity = getActivity();
        boolean force = Boolean.TRUE.equals(call.getBoolean("force", false));
        if (activity == null) {
            resolveAuth(call, false, "no-activity");
            return;
        }
        if (!isConfigured()) {
            Log.w(TAG, "authenticate skipped: APP_ID is unset");
            resolveAuth(call, false, "not-configured");
            return;
        }
        ensureSdk();
        activity.runOnUiThread(() -> {
            try {
                if (force) {
                    startSignIn(activity, call);
                    return;
                }
                PlayGames.getGamesSignInClient(activity)
                    .isAuthenticated()
                    .addOnCompleteListener(task -> {
                        boolean ok = task.isSuccessful()
                            && task.getResult() != null
                            && task.getResult().isAuthenticated();
                        if (ok) {
                            resolveAuth(call, true, null);
                            return;
                        }
                        startSignIn(activity, call);
                    });
            } catch (Exception e) {
                Log.w(TAG, "authenticate failed", e);
                resolveAuth(call, false, message(e));
            }
        });
    }

    private void startSignIn(Activity activity, PluginCall call) {
        try {
            PlayGames.getGamesSignInClient(activity)
                .signIn()
                .addOnCompleteListener(sign -> {
                    boolean signed = sign.isSuccessful()
                        && sign.getResult() != null
                        && sign.getResult().isAuthenticated();
                    if (!signed) {
                        Exception err = sign.getException();
                        Log.w(TAG, "signIn did not authenticate", err);
                        resolveAuth(call, false, err != null ? message(err) : "not-authenticated");
                        return;
                    }
                    resolveAuth(call, true, null);
                });
        } catch (Exception e) {
            Log.w(TAG, "signIn threw", e);
            resolveAuth(call, false, message(e));
        }
    }

    @PluginMethod
    public void submitScore(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null || !isConfigured()) {
            resolveOk(call, false);
            return;
        }
        String style = call.getString("style", "zigzag");
        long distance = Math.max(0, call.getInt("distance", 0));
        long obstacles = Math.max(0, call.getInt("obstacles", 0));
        String distId = leaderboardId("distance", style);
        String obsId = leaderboardId("obstacles", style);
        if (!isUsableId(distId) && !isUsableId(obsId)) {
            resolveOk(call, false);
            return;
        }
        ensureSdk();
        activity.runOnUiThread(() -> {
            try {
                if (isUsableId(distId)) {
                    PlayGames.getLeaderboardsClient(activity).submitScore(distId, distance);
                }
                if (isUsableId(obsId)) {
                    PlayGames.getLeaderboardsClient(activity).submitScore(obsId, obstacles);
                }
                resolveOk(call, true);
            } catch (Exception ignored) {
                resolveOk(call, false);
            }
        });
    }

    @PluginMethod
    public void loadFriends(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null || !isConfigured()) {
            resolveFriends(call, false, new JSArray());
            return;
        }
        String style = call.getString("style", "zigzag");
        String tab = call.getString("tab", "distance");
        String boardId = leaderboardId(tab, style);
        ensureSdk();
        activity.runOnUiThread(() -> {
            try {
                PlayGames.getGamesSignInClient(activity)
                    .isAuthenticated()
                    .addOnCompleteListener(authTask -> {
                        boolean signed = authTask.isSuccessful()
                            && authTask.getResult() != null
                            && authTask.getResult().isAuthenticated();
                        if (!signed) {
                            resolveFriends(call, false, new JSArray());
                            return;
                        }
                        PlayGames.getPlayersClient(activity)
                            .getCurrentPlayer()
                            .addOnCompleteListener(playerTask -> {
                                Player local = playerTask.isSuccessful()
                                    ? playerTask.getResult()
                                    : null;
                                String localId = local != null ? safeId(local.getPlayerId()) : "";
                                if (!isUsableId(boardId)) {
                                    finishRows(call, activity, draftsFromLocal(local), localId);
                                    return;
                                }
                                PlayGames.getLeaderboardsClient(activity)
                                    .loadTopScores(
                                        boardId,
                                        LeaderboardVariant.TIME_SPAN_ALL_TIME,
                                        friendsCollection(),
                                        25,
                                        true
                                    )
                                    .addOnCompleteListener(scoreTask -> {
                                        List<Draft> drafts = new ArrayList<>();
                                        if (scoreTask.isSuccessful() && scoreTask.getResult() != null) {
                                            AnnotatedData<?> annotated = scoreTask.getResult();
                                            Object payload = annotated.get();
                                            LeaderboardScoreBuffer buffer = scoresBuffer(payload);
                                            if (buffer != null) {
                                                try {
                                                    for (int i = 0; i < buffer.getCount(); i++) {
                                                        LeaderboardScore score = buffer.get(i);
                                                        Draft draft = draftFromScore(score, localId);
                                                        if (draft != null) drafts.add(draft);
                                                    }
                                                } catch (Exception ignored) {
                                                    // Keep whatever drafts we copied.
                                                } finally {
                                                    buffer.release();
                                                    releaseScores(payload);
                                                }
                                            }
                                        }
                                        mergeLocal(drafts, local, localId);
                                        finishRows(call, activity, drafts, localId);
                                    });
                            });
                    });
            } catch (Exception ignored) {
                resolveFriends(call, false, new JSArray());
            }
        });
    }

    private void finishRows(PluginCall call, Activity activity, List<Draft> drafts, String localId) {
        if (drafts.isEmpty()) {
            resolveFriends(call, true, new JSArray());
            return;
        }
        int pending = 0;
        for (Draft draft : drafts) {
            if (draft.photoUri != null) pending += 1;
        }
        if (pending == 0) {
            resolveFriends(call, true, toArray(drafts));
            return;
        }
        AtomicInteger left = new AtomicInteger(pending);
        AtomicBoolean done = new AtomicBoolean(false);
        List<ImageManager.OnImageLoadedListener> keep = new ArrayList<>();
        Handler handler = new Handler(Looper.getMainLooper());
        Runnable finish = () -> {
            if (done.compareAndSet(false, true)) {
                keep.clear();
                resolveFriends(call, true, toArray(drafts));
            }
        };
        handler.postDelayed(finish, PHOTO_WAIT_MS);
        ImageManager manager;
        try {
            manager = ImageManager.create(activity);
        } catch (Exception ignored) {
            finish.run();
            return;
        }
        for (Draft draft : drafts) {
            if (draft.photoUri == null) continue;
            ImageManager.OnImageLoadedListener listener = (uri, drawable, requested) -> {
                draft.photo = encodeDrawable(drawable);
                if (left.decrementAndGet() <= 0) finish.run();
            };
            keep.add(listener);
            try {
                manager.loadImage(listener, draft.photoUri);
            } catch (Exception ignored) {
                if (left.decrementAndGet() <= 0) finish.run();
            }
        }
    }

    private static List<Draft> draftsFromLocal(Player local) {
        List<Draft> drafts = new ArrayList<>();
        mergeLocal(drafts, local, local != null ? safeId(local.getPlayerId()) : "");
        return drafts;
    }

    private static void mergeLocal(List<Draft> drafts, Player local, String localId) {
        if (local == null) return;
        for (Draft draft : drafts) {
            if (draft.isLocal || (!localId.isEmpty() && localId.equals(draft.playerId))) {
                draft.isLocal = true;
                if (draft.photoUri == null) draft.photoUri = local.getIconImageUri();
                return;
            }
        }
        Draft self = new Draft();
        self.playerId = localId.isEmpty() ? "local" : localId;
        self.name = local.getDisplayName() != null ? local.getDisplayName() : "You";
        self.rank = 0;
        self.score = 0;
        self.isLocal = true;
        self.photoUri = local.getIconImageUri();
        drafts.add(self);
    }

    private static Draft draftFromScore(LeaderboardScore score, String localId) {
        if (score == null) return null;
        Draft draft = new Draft();
        Player holder = score.getScoreHolder();
        draft.playerId = holder != null ? safeId(holder.getPlayerId()) : "";
        String name = score.getScoreHolderDisplayName();
        if (name == null && holder != null) name = holder.getDisplayName();
        draft.name = name != null ? name : "Player";
        draft.rank = (int) score.getRank();
        draft.score = score.getRawScore();
        draft.isLocal = !localId.isEmpty() && localId.equals(draft.playerId);
        Uri icon = score.getScoreHolderIconImageUri();
        if (icon == null && holder != null) icon = holder.getIconImageUri();
        draft.photoUri = icon;
        if (draft.playerId.isEmpty()) draft.playerId = draft.name + ":" + draft.rank;
        return draft;
    }

    private static JSArray toArray(List<Draft> drafts) {
        JSArray rows = new JSArray();
        for (Draft draft : drafts) {
            JSObject row = new JSObject();
            row.put("rank", draft.rank);
            row.put("playerId", draft.playerId);
            row.put("playerName", draft.name);
            row.put("score", draft.score);
            row.put("isLocal", draft.isLocal);
            if (draft.photo != null && !draft.photo.isEmpty()) {
                row.put("photo", draft.photo);
            }
            rows.put(row);
        }
        return rows;
    }

    private static String encodeDrawable(Drawable drawable) {
        if (drawable == null) return null;
        Bitmap bitmap = null;
        try {
            if (drawable instanceof BitmapDrawable) {
                bitmap = ((BitmapDrawable) drawable).getBitmap();
            }
            if (bitmap == null) {
                int w = Math.max(1, drawable.getIntrinsicWidth());
                int h = Math.max(1, drawable.getIntrinsicHeight());
                bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, w, h);
                drawable.draw(canvas);
            }
            int width = bitmap.getWidth();
            int height = bitmap.getHeight();
            if (width > PHOTO_PX || height > PHOTO_PX) {
                float scale = Math.min(PHOTO_PX / (float) width, PHOTO_PX / (float) height);
                int nw = Math.max(1, Math.round(width * scale));
                int nh = Math.max(1, Math.round(height * scale));
                bitmap = Bitmap.createScaledBitmap(bitmap, nw, nh, true);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 72, out);
            return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void ensureSdk() {
        if (sdkReady) return;
        Context context = getContext();
        if (context == null || !isConfigured()) return;
        try {
            Context app = context.getApplicationContext();
            PlayGamesSdk.initialize(app != null ? app : context);
            sdkReady = true;
        } catch (Exception e) {
            Log.w(TAG, "PlayGamesSdk.initialize failed", e);
            sdkReady = false;
        }
    }

    private boolean isConfigured() {
        String appId = resourceString("game_services_project_id");
        return isUsableId(appId) && !"0".equals(appId);
    }

    private String leaderboardId(String tab, String style) {
        boolean arc = "arc".equals(style);
        boolean obstacles = "obstacles".equals(tab);
        if (arc && obstacles) return resourceString("leaderboard_arc_obstacles");
        if (arc) return resourceString("leaderboard_arc_distance");
        if (obstacles) return resourceString("leaderboard_zigzag_obstacles");
        return resourceString("leaderboard_zigzag_distance");
    }

    private String resourceString(String name) {
        Context context = getContext();
        if (context == null) return "";
        int id = context.getResources().getIdentifier(name, "string", context.getPackageName());
        if (id == 0) return "";
        String value = context.getString(id);
        return value == null ? "" : value.trim();
    }

    private static boolean isUsableId(String value) {
        return value != null && !value.isEmpty() && !"unset".equals(value);
    }

    private static String safeId(String value) {
        return value == null ? "" : value.trim();
    }

    private static int friendsCollection() {
        try {
            return LeaderboardVariant.class.getField("COLLECTION_FRIENDS").getInt(null);
        } catch (Exception ignored) {
            try {
                return LeaderboardVariant.class.getField("COLLECTION_SOCIAL").getInt(null);
            } catch (Exception ignored2) {
                return LeaderboardVariant.COLLECTION_PUBLIC;
            }
        }
    }

    private static LeaderboardScoreBuffer scoresBuffer(Object payload) {
        if (payload == null) return null;
        if (payload instanceof LeaderboardScoreBuffer) {
            return (LeaderboardScoreBuffer) payload;
        }
        try {
            Object buffer = payload.getClass().getMethod("getScores").invoke(payload);
            if (buffer instanceof LeaderboardScoreBuffer) {
                return (LeaderboardScoreBuffer) buffer;
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private static void releaseScores(Object payload) {
        if (payload == null || payload instanceof LeaderboardScoreBuffer) return;
        try {
            payload.getClass().getMethod("release").invoke(payload);
        } catch (Exception ignored) {
            // LeaderboardScores.release is best-effort.
        }
    }

    private static void resolveAuth(PluginCall call, boolean signedIn, String error) {
        JSObject result = new JSObject();
        result.put("signedIn", signedIn);
        result.put("configured", !"not-configured".equals(error));
        if (error != null && !error.isEmpty()) {
            result.put("error", error);
        }
        call.resolve(result);
    }

    private static String message(Exception e) {
        if (e == null) return "error";
        String text = e.getMessage();
        return text != null && !text.isEmpty() ? text : e.getClass().getSimpleName();
    }

    private static void resolveOk(PluginCall call, boolean ok) {
        JSObject result = new JSObject();
        result.put("ok", ok);
        call.resolve(result);
    }

    private static void resolveFriends(PluginCall call, boolean signedIn, JSArray rows) {
        JSObject result = new JSObject();
        result.put("signedIn", signedIn);
        result.put("rows", rows);
        call.resolve(result);
    }

    private static final class Draft {
        String playerId = "";
        String name = "Player";
        int rank;
        long score;
        boolean isLocal;
        Uri photoUri;
        String photo;
    }
}
