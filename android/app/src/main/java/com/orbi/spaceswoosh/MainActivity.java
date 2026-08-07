// Updated: package renamed from gg.orbi.spaceswoosh to com.orbi.spaceswoosh.
// Registers RefreshRatePlugin (display 120 Hz pin during runs).
package com.orbi.spaceswoosh;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RefreshRatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
