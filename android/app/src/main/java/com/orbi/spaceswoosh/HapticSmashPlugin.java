// HapticSmashPlugin.java
// Changes: Quiet Light-impact tick for shielded obstacle smashes.
// Same waveform family as Capacitor ImpactStyle.Light (0 delay, ~50ms pulse)
// at ~64% amplitude so smash is felt but softer than a wall BOOP.
package com.orbi.spaceswoosh;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HapticSmash")
public class HapticSmashPlugin extends Plugin {

    // Cap Light is {0, 50} ms at amplitude 110. Keep the click, drop the punch.
    private static final long[] TIMINGS = { 0, 40 };
    private static final int[] AMPLITUDES = { 0, 70 };
    private static final long[] OLD_SDK_PATTERN = { 0, 16 };

    @PluginMethod
    public void tick(PluginCall call) {
        try {
            Vibrator vibrator = vibrator();
            if (vibrator == null || !vibrator.hasVibrator()) {
                call.resolve();
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(TIMINGS, AMPLITUDES, -1));
            } else {
                @SuppressWarnings("deprecation")
                long[] pattern = OLD_SDK_PATTERN;
                vibrator.vibrate(pattern, -1);
            }
        } catch (Exception ignored) {
            // Missing vibrator must never stall a smash frame.
        }
        call.resolve();
    }

    private Vibrator vibrator() {
        Context context = getContext();
        if (context == null) return null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager =
                (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager != null ? manager.getDefaultVibrator() : null;
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }
}
