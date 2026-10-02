package com.tajvid.app.plugins;

import android.app.Activity;
import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.nativead.MediaView;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdView;

@CapacitorPlugin(name = "TajVidNativeAd")
public class TajVidNativeAdPlugin extends Plugin {

    private NativeAdView nativeAdView;
    private NativeAd nativeAd;
    private FrameLayout container;

    @com.getcapacitor.PluginMethod
    public void showNativeAd(PluginCall call) {

        Activity activity = getActivity();

        if (activity == null) {
            call.reject("Activity is not available");
            return;
        }

        String adUnitId = call.getString(
            "adUnitId",
            "ca-app-pub-4854925555711332/2667362603"
        );

        int x = call.getInt("x", 0);
        int y = call.getInt("y", 0);
        int width = call.getInt("width", -1);
        int height = call.getInt("height", dpToPx(180));

        activity.runOnUiThread(() -> {

            FrameLayout root =
                activity.findViewById(android.R.id.content);

            if (root == null) {
                call.reject("Android root view not found");
                return;
            }

            removeNativeAd();

            AdLoader adLoader =
                new AdLoader.Builder(activity, adUnitId)

                    .forNativeAd(ad -> {

                        nativeAd = ad;

                        nativeAdView =
                            new NativeAdView(activity);

                        nativeAdView.setBackgroundColor(Color.WHITE);

                        FrameLayout.LayoutParams adParams =
                            new FrameLayout.LayoutParams(
                                width > 0
                                    ? width
                                    : FrameLayout.LayoutParams.MATCH_PARENT,
                                height
                            );

                        adParams.leftMargin = x;
                        adParams.topMargin = y;

                        nativeAdView.setLayoutParams(adParams);

                        // =========================================
                        // AD CONTAINER
                        // =========================================

                        container =
                            new FrameLayout(activity);

                        container.setBackgroundColor(Color.WHITE);

                        FrameLayout.LayoutParams containerParams =
                            new FrameLayout.LayoutParams(
                                width > 0
                                    ? width
                                    : FrameLayout.LayoutParams.MATCH_PARENT,
                                height
                            );

                        containerParams.leftMargin = x;
                        containerParams.topMargin = y;

                        container.setLayoutParams(containerParams);

                        // =========================================
                        // "AD" LABEL
                        // =========================================

                        TextView adLabel =
                            new TextView(activity);

                        adLabel.setText("Ad");
                        adLabel.setTextColor(Color.DKGRAY);
                        adLabel.setTextSize(11);
                        adLabel.setGravity(Gravity.CENTER);

                        FrameLayout.LayoutParams labelParams =
                            new FrameLayout.LayoutParams(
                                dpToPx(32),
                                dpToPx(22)
                            );

                        labelParams.leftMargin = dpToPx(8);
                        labelParams.topMargin = dpToPx(6);

                        adLabel.setLayoutParams(labelParams);

                        nativeAdView.addView(adLabel);

                        // =========================================
                        // MEDIA
                        // =========================================

                        MediaView mediaView =
                            new MediaView(activity);

                        FrameLayout.LayoutParams mediaParams =
                            new FrameLayout.LayoutParams(
                                dpToPx(105),
                                dpToPx(105)
                            );

                        mediaParams.leftMargin = dpToPx(8);
                        mediaParams.topMargin = dpToPx(38);

                        mediaView.setLayoutParams(mediaParams);

                        nativeAdView.addView(mediaView);
                        nativeAdView.setMediaView(mediaView);

                        // =========================================
                        // HEADLINE
                        // =========================================

                        TextView headline =
                            new TextView(activity);

                        headline.setTextColor(Color.BLACK);
                        headline.setTextSize(16);
                        headline.setMaxLines(2);

                        FrameLayout.LayoutParams headlineParams =
                            new FrameLayout.LayoutParams(
                                dpToPx(210),
                                FrameLayout.LayoutParams.WRAP_CONTENT
                            );

                        headlineParams.leftMargin = dpToPx(122);
                        headlineParams.topMargin = dpToPx(35);

                        headline.setLayoutParams(headlineParams);

                        nativeAdView.addView(headline);
                        nativeAdView.setHeadlineView(headline);

                        headline.setText(ad.getHeadline());

                        // =========================================
                        // BODY
                        // =========================================

                        TextView body =
                            new TextView(activity);

                        body.setTextColor(Color.DKGRAY);
                        body.setTextSize(13);
                        body.setMaxLines(3);

                        FrameLayout.LayoutParams bodyParams =
                            new FrameLayout.LayoutParams(
                                dpToPx(210),
                                FrameLayout.LayoutParams.WRAP_CONTENT
                            );

                        bodyParams.leftMargin = dpToPx(122);
                        bodyParams.topMargin = dpToPx(78);

                        body.setLayoutParams(bodyParams);

                        nativeAdView.addView(body);
                        nativeAdView.setBodyView(body);

                        if (ad.getBody() != null) {
                            body.setText(ad.getBody());
                            body.setVisibility(View.VISIBLE);
                        } else {
                            body.setVisibility(View.GONE);
                        }

                        // =========================================
                        // CALL TO ACTION
                        // =========================================

                        Button cta =
                            new Button(activity);

                        cta.setTextColor(Color.WHITE);
                        cta.setTextSize(12);

                        FrameLayout.LayoutParams ctaParams =
                            new FrameLayout.LayoutParams(
                                dpToPx(145),
                                dpToPx(42)
                            );

                        ctaParams.leftMargin = dpToPx(122);
                        ctaParams.topMargin = dpToPx(125);

                        cta.setLayoutParams(ctaParams);

                        nativeAdView.addView(cta);
                        nativeAdView.setCallToActionView(cta);

                        if (ad.getCallToAction() != null) {
                            cta.setText(ad.getCallToAction());
                            cta.setVisibility(View.VISIBLE);
                        } else {
                            cta.setVisibility(View.GONE);
                        }

                        // =========================================
                        // CONNECT AD
                        // =========================================

                        nativeAdView.setNativeAd(ad);

                        container.addView(nativeAdView);

                        root.addView(container);

                        JSObject result = new JSObject();
                        result.put("success", true);

                        call.resolve(result);
                    })

                    .withAdListener(new AdListener() {

                        @Override
                        public void onAdFailedToLoad(
                            @NonNull LoadAdError error
                        ) {

                            JSObject result =
                                new JSObject();

                            result.put("success", false);
                            result.put(
                                "error",
                                error.getMessage()
                            );

                            call.reject(
                                error.getMessage(),
                                result
                            );
                        }
                    })

                    .build();

            adLoader.loadAd(
                new AdRequest.Builder().build()
            );
        });
    }

    // =========================================================
    // MOVE NATIVE AD
    // =========================================================

    @com.getcapacitor.PluginMethod
    public void updateNativeAdPosition(PluginCall call) {

        Activity activity = getActivity();

        if (activity == null) {
            call.resolve();
            return;
        }

        int x = call.getInt("x", 0);
        int y = call.getInt("y", 0);
        int width = call.getInt("width", -1);
        int height = call.getInt("height", dpToPx(180));

        activity.runOnUiThread(() -> {

            if (container == null) {
                call.resolve();
                return;
            }

            FrameLayout.LayoutParams params =
                (FrameLayout.LayoutParams)
                    container.getLayoutParams();

            params.leftMargin = x;
            params.topMargin = y;

            if (width > 0) {
                params.width = width;
            }

            params.height = height;

            container.setLayoutParams(params);

            if (nativeAdView != null) {

                FrameLayout.LayoutParams adParams =
                    (FrameLayout.LayoutParams)
                        nativeAdView.getLayoutParams();

                adParams.leftMargin = 0;
                adParams.topMargin = 0;

                if (width > 0) {
                    adParams.width = width;
                }

                adParams.height = height;

                nativeAdView.setLayoutParams(adParams);
            }

            call.resolve();
        });
    }

    // =========================================================
    // HIDE
    // =========================================================

    @com.getcapacitor.PluginMethod
    public void hideNativeAd(PluginCall call) {

        Activity activity = getActivity();

        if (activity == null) {
            call.resolve();
            return;
        }

        activity.runOnUiThread(() -> {

            removeNativeAd();

            call.resolve();
        });
    }

    // =========================================================
    // REMOVE
    // =========================================================

    private void removeNativeAd() {

        if (nativeAd != null) {
            nativeAd.destroy();
            nativeAd = null;
        }

        if (container != null) {

            View parent =
                (View) container.getParent();

            if (parent instanceof FrameLayout) {

                ((FrameLayout) parent)
                    .removeView(container);
            }

            container.removeAllViews();
            container = null;
        }

        nativeAdView = null;
    }

    // =========================================================
    // DP -> PX
    // =========================================================

    private int dpToPx(int dp) {

        Activity activity = getActivity();

        if (activity == null) {
            return dp;
        }

        float density =
            activity
                .getResources()
                .getDisplayMetrics()
                .density;

        return Math.round(dp * density);
    }
}
