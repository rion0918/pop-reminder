package com.rion0918.popreminder.notifications

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ExactAlarmPermissionModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "ExactAlarmPermission"

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.resolve(true)
      return
    }

    val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    promise.resolve(alarmManager.canScheduleExactAlarms())
  }

  @ReactMethod
  fun openExactAlarmSettings(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.resolve(null)
      return
    }

    val packageUri = Uri.parse("package:${reactContext.packageName}")
    val exactAlarmIntent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, packageUri).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    try {
      reactContext.startActivity(exactAlarmIntent)
      promise.resolve(null)
    } catch (error: Exception) {
      try {
        val appSettingsIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(appSettingsIntent)
        promise.resolve(null)
      } catch (fallbackError: Exception) {
        promise.reject("exact_alarm_settings_unavailable", fallbackError)
      }
    }
  }
}
