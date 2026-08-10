package expo.modules.proximitysensor

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.core.os.bundleOf
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoProximitySensorModule : Module(), SensorEventListener {
  private val eventName = "onProximityChange"
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private val sensorManager: SensorManager
    get() = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  private val proximitySensor: Sensor?
    get() = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)

  override fun definition() = ModuleDefinition {
    Name("ExpoProximitySensor")

    Events(eventName)

    AsyncFunction("isAvailableAsync") {
      proximitySensor != null
    }

    OnStartObserving(eventName) {
      proximitySensor?.let { sensor ->
        sensorManager.registerListener(this@ExpoProximitySensorModule, sensor, SensorManager.SENSOR_DELAY_NORMAL)
      }
    }

    OnStopObserving(eventName) {
      sensorManager.unregisterListener(this@ExpoProximitySensorModule)
    }

    OnDestroy {
      sensorManager.unregisterListener(this@ExpoProximitySensorModule)
    }
  }

  override fun onSensorChanged(event: SensorEvent) {
    val distance = event.values.firstOrNull() ?: return
    sendEvent(eventName, bundleOf("near" to (distance < event.sensor.maximumRange)))
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
}
