// MainActivity.java
// Changes: EdgeToEdge.enable() before super.onCreate so Android 14 and
// earlier draw under the system bars the same way Android 15+ does by
// default (Play "edge-to-edge may not display for all users"). Insets
// are applied in CSS via Capacitor SystemBars. Registers InAppReview,
// HapticSmash, and RefreshRate plugins.
package com.orbi.spaceswoosh;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RefreshRatePlugin.class);
        registerPlugin(HapticSmashPlugin.class);
        registerPlugin(InAppReviewPlugin.class);
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
