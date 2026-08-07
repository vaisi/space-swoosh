// HapticTickPlugin.java
// Native wall-boop haptic. Capacitor's JS Haptics plugin often feels like a
// no-op on modern Android haptic actuators (waveform/oneShot at low amplitude).
// EFFECT_CLICK / EFFECT_HEAVY_CLICK go through the touch-haptic path instead.
package com.orbi.spaceswoosh;

import android.content.Context;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HapticTick")
public class HapticTickPlugin extends Plugin {
    private static final String TAG = "HapticTick";

    private Vibrator vibrator;

    @Override
    public void load() {
        Context ctx = getContext();
        if (ctx == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager =
                (VibratorManager) ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = manager != null ? manager.getDefaultVibrator() : null;
        } else {
            vibrator = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
        }
        Log.i(TAG, "loaded hasVibrator="
            + (vibrator != null && vibrator.hasVibrator()));
    }

    /** Soft sidewall tick (preferred for wall BOOP). */
    @PluginMethod
    public void tick(PluginCall call) {
        pulse(VibrationEffect.EFFECT_CLICK, 35);
        call.resolve();
    }

    /** Stronger smoke-test / fallback pulse. */
    @PluginMethod
    public void thump(PluginCall call) {
        pulse(VibrationEffect.EFFECT_HEAVY_CLICK, 55);
        call.resolve();
    }

    private void pulse(int predefinedEffect, int legacyMs) {
        if (vibrator == null || !vibrator.hasVibrator()) {
            Log.w(TAG, "no vibrator — pulse skipped");
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                VibrationEffect effect = VibrationEffect.createPredefined(predefinedEffect);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    vibrator.vibrate(
                        effect,
                        VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH)
                    );
                } else {
                    vibrator.vibrate(effect);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(
                    VibrationEffect.createOneShot(legacyMs, VibrationEffect.DEFAULT_AMPLITUDE)
                );
            } else {
                //noinspection deprecation
                vibrator.vibrate(legacyMs);
            }
            Log.d(TAG, "pulse ok effect=" + predefinedEffect);
        } catch (Exception e) {
            Log.e(TAG, "pulse failed", e);
        }
    }
}
