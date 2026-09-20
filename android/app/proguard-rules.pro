# proguard-rules.pro
# Changes: R8 keep rules for Capacitor plugins, WebView JS bridges, Play
# Review, Play Games v2 (including ImageManager profile photos), and Firebase
# Analytics so minifyEnabled release builds still resolve plugin methods by name.
#
# Capacitor-android already ships consumer rules for @CapacitorPlugin and
# Plugin subclasses. These extras cover JS interfaces and first-party SDKs
# that the app calls from Java.

# WebView JavaScript interfaces (Capacitor SystemBars injects one).
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# First-party plugins registered from MainActivity (also covered by
# "extends Plugin", kept explicit so a rename cannot silently strip them).
-keep class com.orbi.spaceswoosh.InAppReviewPlugin { *; }
-keep class com.orbi.spaceswoosh.HapticSmashPlugin { *; }
-keep class com.orbi.spaceswoosh.RefreshRatePlugin { *; }
-keep class com.orbi.spaceswoosh.PlayGamesPlugin { *; }

# Play In-App Review (called from InAppReviewPlugin).
-keep class com.google.android.play.core.review.** { *; }
-keep class com.google.android.gms.tasks.** { *; }

# Play Games Services v2 (Friends board).
-keep class com.google.android.gms.games.** { *; }
-keep class com.google.android.gms.games.leaderboard.** { *; }
-keep class com.google.android.gms.common.images.ImageManager { *; }
-keep class com.google.android.gms.common.images.ImageManager$OnImageLoadedListener { *; }

# Firebase Analytics (Capacitor plugin + Play Data Safety "no AD_ID").
-keep class com.google.firebase.analytics.** { *; }
-keep class io.capawesome.capacitorjs.plugins.firebase.analytics.** { *; }

# RevenueCat ships its own consumer rules; keep the Capacitor bridge class.
-keep class com.revenuecat.purchases.capacitor.** { *; }

# Keep line numbers in crash traces without leaking source paths.
-keepattributes SourceFile,LineNumberTable,RuntimeVisibleAnnotations,AnnotationDefault
-renamesourcefileattribute SourceFile
