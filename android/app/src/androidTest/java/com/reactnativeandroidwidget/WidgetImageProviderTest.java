package com.reactnativeandroidwidget;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.io.FileInputStream;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

@RunWith(AndroidJUnit4.class)
public class WidgetImageProviderTest {
    @Test
    public void anOpenLauncherReadKeepsThePreviousCompleteImageDuringRefresh() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        File file = new File(new File(context.getFilesDir(), "widget_images"), "widget_atomic_test.png");
        Bitmap first = Bitmap.createBitmap(2, 2, Bitmap.Config.ARGB_8888);
        Bitmap second = Bitmap.createBitmap(2, 2, Bitmap.Config.ARGB_8888);
        first.eraseColor(0xffff0000);
        second.eraseColor(0xff0000ff);

        try {
            RNWidgetImageProvider.writeImage(context, file.getName(), first);
            try (FileInputStream launcherRead = new FileInputStream(file)) {
                RNWidgetImageProvider.writeImage(context, file.getName(), second);
                Bitmap observed = BitmapFactory.decodeStream(launcherRead);
                assertNotNull(observed);
                assertEquals(0xffff0000, observed.getPixel(0, 0));
            }
            Bitmap current = BitmapFactory.decodeFile(file.getPath());
            assertNotNull(current);
            assertEquals(0xff0000ff, current.getPixel(0, 0));
        } finally {
            file.delete();
            first.recycle();
            second.recycle();
        }
    }
}
