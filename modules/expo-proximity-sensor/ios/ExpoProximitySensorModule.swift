import ExpoModulesCore
import UIKit

public final class ExpoProximitySensorModule: Module {
  private let eventName = "onProximityChange"
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ExpoProximitySensor")

    Events(eventName)

    AsyncFunction("isAvailableAsync") { () -> Bool in
      let device = UIDevice.current
      let wasEnabled = device.isProximityMonitoringEnabled
      device.isProximityMonitoringEnabled = true
      let available = device.isProximityMonitoringEnabled
      if !wasEnabled {
        device.isProximityMonitoringEnabled = false
      }
      return available
    }
    .runOnQueue(.main)

    OnStartObserving(eventName) {
      self.startObserving()
    }

    OnStopObserving(eventName) {
      self.stopObserving()
    }

    OnDestroy {
      self.stopObserving()
    }
  }

  private func startObserving() {
    guard observer == nil else { return }

    let device = UIDevice.current
    device.isProximityMonitoringEnabled = true
    guard device.isProximityMonitoringEnabled else { return }

    sendEvent(eventName, ["near": device.proximityState])
    observer = NotificationCenter.default.addObserver(
      forName: UIDevice.proximityStateDidChangeNotification,
      object: device,
      queue: .main
    ) { [weak self] _ in
      self?.sendEvent(self?.eventName ?? "onProximityChange", ["near": device.proximityState])
    }
  }

  private func stopObserving() {
    if let observer {
      NotificationCenter.default.removeObserver(observer)
      self.observer = nil
    }
    UIDevice.current.isProximityMonitoringEnabled = false
  }
}
