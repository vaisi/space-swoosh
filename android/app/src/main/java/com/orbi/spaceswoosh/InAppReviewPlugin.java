// InAppReviewPlugin.java
// Changes: Created — Play In-App Review sheet plus a store-listing fallback.
package com.orbi.spaceswoosh;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Task;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

@CapacitorPlugin(name = "InAppReview")
public class InAppReviewPlugin extends Plugin {

    @PluginMethod
    public void requestReview(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            resolveOk(call, false);
            return;
        }
        try {
            ReviewManager manager = ReviewManagerFactory.create(activity);
            Task<ReviewInfo> request = manager.requestReviewFlow();
            request.addOnCompleteListener(task -> {
                if (!task.isSuccessful() || task.getResult() == null) {
                    resolveOk(call, false);
                    return;
                }
                manager.launchReviewFlow(activity, task.getResult())
                    .addOnCompleteListener(launch -> resolveOk(call, launch.isSuccessful()));
            });
        } catch (Exception ignored) {
            resolveOk(call, false);
        }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            resolveOk(call, false);
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            resolveOk(call, true);
        } catch (Exception ignored) {
            resolveOk(call, false);
        }
    }

    private void resolveOk(PluginCall call, boolean ok) {
        JSObject result = new JSObject();
        result.put("ok", ok);
        call.resolve(result);
    }
}
