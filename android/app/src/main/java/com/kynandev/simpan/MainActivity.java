package com.kynandev.simpan;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private String pendingShareJson = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSendIntent(intent);
    }

    private void handleSendIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            try {
                final JSONObject shareObj = new JSONObject();
                shareObj.put("mimeType", type);

                if (intent.hasExtra(Intent.EXTRA_TEXT)) {
                    String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                    shareObj.put("text", sharedText);
                }

                Uri streamUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (streamUri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
                    streamUri = intent.getClipData().getItemAt(0).getUri();
                }

                if (streamUri != null) {
                    InputStream inputStream = getContentResolver().openInputStream(streamUri);
                    if (inputStream != null) {
                        ByteArrayOutputStream byteBuffer = new ByteArrayOutputStream();
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = inputStream.read(buffer)) != -1) {
                            byteBuffer.write(buffer, 0, len);
                        }
                        inputStream.close();
                        byte[] bytes = byteBuffer.toByteArray();
                        String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
                        String dataUrl = "data:" + type + ";base64," + base64;
                        shareObj.put("dataUrl", dataUrl);
                        shareObj.put("filename", streamUri.getLastPathSegment() != null ? streamUri.getLastPathSegment() : "Telegram_Shared");
                    }
                }

                final String jsonStr = shareObj.toString();
                pendingShareJson = jsonStr;
                notifyWebview(jsonStr);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void notifyWebview(final String jsonStr) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(new Runnable() {
                @Override
                public void run() {
                    getBridge().getWebView().evaluateJavascript(
                        "window.__simpanPendingIncomingShare = " + jsonStr + ";" +
                        "window.dispatchEvent(new CustomEvent('simpan_incoming_share', { detail: " + jsonStr + " }));",
                        null
                    );
                }
            });
        }
    }
}
