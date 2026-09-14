// MainActivity.java
// Changes: Caption guard outlives Capacitor SystemBars. Plugin load posts
// show(systemBars) which includes captionBar and used to restore the
// "Spac…" strip after hide. Empty activity title, hide captionBar on
// every inset pass, zero caption insets, GONE DecorCaption / ActionBar
// views. Re-hide on attach, start, resume, and window focus. Registers
// InAppReview, HapticSmash, and RefreshRate.
package com.orbi.spaceswoosh;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.ActionBar;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean captionGuardInstalled = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RefreshRatePlugin.class);
        registerPlugin(HapticSmashPlugin.class);
        registerPlugin(InAppReviewPlugin.class);
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE);
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        setTitle("");
        Window window = getWindow();
        if (window != null) {
            window.setTitle("");
        }
        installCaptionGuard();
        hideHostTitleChrome();
    }

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        hideHostTitleChrome();
    }

    @Override
    public void onStart() {
        super.onStart();
        hideHostTitleChrome();
    }

    @Override
    public void onResume() {
        super.onResume();
        hideHostTitleChrome();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideHostTitleChrome();
        }
    }

    /**
     * Re-hide captionBar after Capacitor SystemBars.show(systemBars) and
     * drop caption insets so CSS does not reserve a dark gap.
     */
    private void installCaptionGuard() {
        if (captionGuardInstalled) {
            return;
        }
        Window window = getWindow();
        if (window == null || window.getDecorView() == null) {
            return;
        }
        captionGuardInstalled = true;
        View decor = window.getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            hideHostTitleChrome();
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(WindowInsetsCompat.Type.captionBar(), Insets.NONE)
                .build();
        });
        // SystemBars.initSystemBars posts show(systemBars) on the main
        // thread after onCreate — run again once that message has landed.
        decor.post(this::hideHostTitleChrome);
        decor.postDelayed(this::hideHostTitleChrome, 250);
        decor.postDelayed(this::hideHostTitleChrome, 1000);
    }

    /** Drop ActionBar / Android 15+ caption bar (icon + "Space…") on all screens. */
    private void hideHostTitleChrome() {
        setTitle("");
        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            actionBar.setDisplayShowTitleEnabled(false);
            actionBar.setDisplayShowHomeEnabled(false);
            actionBar.setDisplayUseLogoEnabled(false);
            actionBar.hide();
        }
        Window window = getWindow();
        if (window == null || window.getDecorView() == null) {
            return;
        }
        window.setTitle("");
        WindowInsetsControllerCompat insets =
            WindowCompat.getInsetsController(window, window.getDecorView());
        insets.hide(WindowInsetsCompat.Type.captionBar());
        hideCaptionDecorViews(window.getDecorView());
        hideViewById(androidx.appcompat.R.id.action_bar);
        hideViewById(androidx.appcompat.R.id.action_bar_container);
        hideViewById(androidx.appcompat.R.id.action_bar_overlay_layout);
        int frameworkCaption = getResources().getIdentifier("caption", "id", "android");
        if (frameworkCaption != 0) {
            hideViewById(frameworkCaption);
        }
    }

    private void hideViewById(int id) {
        View bar = findViewById(id);
        if (bar != null) {
            bar.setVisibility(View.GONE);
        }
    }

    private void hideCaptionDecorViews(View view) {
        if (view == null) {
            return;
        }
        String name = view.getClass().getSimpleName();
        if (name.contains("DecorCaption")
            || name.contains("CaptionView")
            || name.equals("ActionBarContainer")
            || name.equals("ActionBarView")) {
            view.setVisibility(View.GONE);
        }
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                hideCaptionDecorViews(group.getChildAt(i));
            }
        }
    }
}
