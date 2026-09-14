// MainActivity.java
// Changes: Hide ActionBar + captionBar on create, resume, and window
// focus. The strip (app icon + truncated "Space Swoosh") sat above every
// screen — menu, Options, and the run — not only gameplay. Splash theme
// fallback and desktop-windowing headers both used the application label.
// EdgeToEdge.enable() still runs before super.onCreate. Registers
// InAppReview, HapticSmash, and RefreshRate.
package com.orbi.spaceswoosh;

import android.os.Bundle;
import android.view.Window;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.ActionBar;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RefreshRatePlugin.class);
        registerPlugin(HapticSmashPlugin.class);
        registerPlugin(InAppReviewPlugin.class);
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE);
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
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

    /** Drop ActionBar / Android 15+ caption bar (icon + "Space…") on all screens. */
    private void hideHostTitleChrome() {
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
        WindowInsetsControllerCompat insets =
            WindowCompat.getInsetsController(window, window.getDecorView());
        insets.hide(WindowInsetsCompat.Type.captionBar());
    }
}
