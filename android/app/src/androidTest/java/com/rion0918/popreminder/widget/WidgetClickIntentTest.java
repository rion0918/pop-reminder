package com.rion0918.popreminder.widget;

import android.app.PendingIntent;
import android.content.Context;
import android.os.Bundle;
import android.content.Intent;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import com.reactnativeandroidwidget.WidgetClickIntent;

@RunWith(AndroidJUnit4.class)
public class WidgetClickIntentTest {
    private PendingIntent click(int widgetId, String action, String id) {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Bundle data = new Bundle();
        data.putString("id", id);
        if ("OPEN_URI".equals(action)) data.putString("uri", "popreminder://?action=view&id=" + id);
        return WidgetClickIntent.create(context, PopReminderWidget.class.getName(), widgetId, action, data);
    }

    @Test
    public void legacySameMillisecondRegistrationCancelsTheEarlierButton() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Intent intent = new Intent(context, PopReminderWidget.class).setAction(context.getPackageName() + ".WIDGET_CLICK");
        int sameMillisecond = 1003;
        PendingIntent first = PendingIntent.getBroadcast(context, sameMillisecond, intent.putExtra("id", "first"), PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent second = PendingIntent.getBroadcast(context, sameMillisecond, intent.putExtra("id", "second"), PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            first.send();
            fail("The legacy registration should cancel the earlier button");
        } catch (PendingIntent.CanceledException expected) {
            // Reproduces the original failure without relying on clock timing.
        } finally {
            second.cancel();
        }
    }

    @Test
    public void testButtonsAndWidgetInstancesNeverCancelEachOther() {
        PendingIntent detail = click(1001, "OPEN_URI", "first");
        PendingIntent delete = click(1001, "DELETE_REMINDER", "first");
        PendingIntent other = click(1001, "OPEN_URI", "second");
        PendingIntent secondWidget = click(1002, "OPEN_URI", "first");
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PendingIntent firstCollection = WidgetClickIntent.createCollectionTemplate(
            context, PopReminderWidget.class.getName(), 1001);
        PendingIntent secondCollection = WidgetClickIntent.createCollectionTemplate(
            context, PopReminderWidget.class.getName(), 1002);
        try {
            assertFalse(detail.equals(delete));
            assertFalse(detail.equals(other));
            assertFalse(detail.equals(secondWidget));
            assertFalse(firstCollection.equals(secondCollection));
            for (int i = 0; i < 100; i++) {
                assertEquals(detail, click(1001, "OPEN_URI", "first"));
                assertEquals(delete, click(1001, "DELETE_REMINDER", "first"));
            }
        } finally {
            detail.cancel(); delete.cancel(); other.cancel(); secondWidget.cancel();
            firstCollection.cancel(); secondCollection.cancel();
        }
    }
}
