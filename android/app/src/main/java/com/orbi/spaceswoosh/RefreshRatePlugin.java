// RefreshRatePlugin.java
// Pins the display to its highest refresh mode while a run is on screen.
// Why: Android VRR panels rest at 60 Hz and only boost to 120 while a finger
// is down, so sparse taps flap the display 60<->120 mid-run — visible as a
// smoothness texture change even with clock-true frame pacing. Pinning the
// mode makes the touch-boost cadence the run's permanent state.
package com.orbi.spaceswoosh;

import android.os.Build;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RefreshRate")
public class RefreshRatePlugin extends Plugin {

    @PluginMethod
    public void pinHigh(PluginCall call) {
        apply(true);
        call.resolve();
    }

    @PluginMethod
    public void release(PluginCall call) {
        apply(false);
        call.resolve();
    }

    private void apply(final boolean high) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return; // Display.Mode is API 23+
        if (getActivity() == null) return;
        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                WindowManager.LayoutParams params = window.getAttributes();
                if (high) {
                    Display display = getActivity().getWindowManager().getDefaultDisplay();
                    Display.Mode active = display.getMode();
                    Display.Mode best = active;
                    // Highest refresh rate at the current resolution — never
                    // switch resolution, that would re-layout the whole app.
                    for (Display.Mode mode : display.getSupportedModes()) {
                        if (mode.getPhysicalWidth() == active.getPhysicalWidth()
                                && mode.getPhysicalHeight() == active.getPhysicalHeight()
                                && mode.getRefreshRate() > best.getRefreshRate()) {
                            best = mode;
                        }
                    }
                    params.preferredDisplayModeId = best.getModeId();
                    // Hint for devices that honour the rate but not the mode id.
                    params.preferredRefreshRate = best.getRefreshRate();
                } else {
                    // 0 = no preference: hand rate control back to the system.
                    params.preferredDisplayModeId = 0;
                    params.preferredRefreshRate = 0f;
                }
                window.setAttributes(params);
            } catch (Exception ignored) {
                // A refresh pin is a nicety — never let it take the app down.
            }
        });
    }
}
