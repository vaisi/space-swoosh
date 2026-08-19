// Updated: registers HapticSmashPlugin (quiet Light-impact smash tick).
// Registers RefreshRatePlugin (display 120 Hz pin during runs).
// HapticTickPlugin removed — Cap ImpactStyle.Light is enough once OS haptics
// intensity is non-zero.
package com.orbi.spaceswoosh;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RefreshRatePlugin.class);
        registerPlugin(HapticSmashPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
