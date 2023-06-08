//
//  ScanViewController.swift
//  CoreBluetoothLESample
//
//  Created by Lifflander, Jonathan on 6/1/23.
//  Copyright © 2023 Apple. All rights reserved.
//

import Foundation
import UIKit
import CoreBluetooth
import os

class CustomCell : UITableViewCell {
    @IBOutlet weak var lblOfDeviceName : UILabel!
}

class ScanViewController : UIViewController {
    @IBOutlet weak var bleList : UITableView!
    @IBOutlet weak var scanButton : UIButton!
    @IBOutlet weak var activity : UIActivityIndicatorView!
    @IBOutlet weak var lblTryingConnect : UILabel!
    
    var peripherals : [CBPeripheral] = []
    var centralManager : CBCentralManager!
    var currentPeripheral : CBPeripheral?
    var transferCharacteristic: CBCharacteristic?
    var connectViewController : ConnectViewController?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        centralManager = CBCentralManager(delegate: self, queue: .main)
        bleList.dataSource = self
        bleList.delegate = self
        activity.hidesWhenStopped = true
        lblTryingConnect.text = ""
    }
    
    @IBAction func scanButtonClick(sender: Any) {
        print("Start scanning")
        activity.startAnimating()
        centralManager?.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        DispatchQueue.main.asyncAfter(deadline: .now() + 60.0) {
            self.centralManager.stopScan()
            self.activity.stopAnimating()
            print("Stop scanning")
        }
    }
}

extension ScanViewController : UITableViewDelegate, UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        //print("count=", peripherals.count)
        return peripherals.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = self.bleList.dequeueReusableCell(withIdentifier: "listCell", for: indexPath) as! CustomCell
        let peripheral = peripherals[indexPath.row]
        cell.lblOfDeviceName.text = peripheral.name
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let peripheral = peripherals[indexPath.row]
        print("Details : ", peripheral)
        centralManager.connect(peripheral, options: nil)
        lblTryingConnect.text = "Trying to connect to: " + peripheral.name!
        tableView.deselectRow(at: indexPath, animated: true)
    }
}

extension ScanViewController : CBCentralManagerDelegate {
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        if peripheral.name != nil && peripheral.name != "" {
            if (peripherals.filter { $0.name == peripheral.name }).isEmpty {
                self.peripherals.append(peripheral)
                print("Discovered \(peripheral.name ?? "")")
                self.bleList.reloadData()
            }
        }
    }
    
    internal func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            // ... so start working with the peripheral
            os_log("CBManager is powered on")
        case .poweredOff:
            os_log("CBManager is not powered on")
            // In a real app, you'd deal with all the states accordingly
            return
        case .resetting:
            os_log("CBManager is resetting")
            // In a real app, you'd deal with all the states accordingly
            return
        case .unauthorized:
            // In a real app, you'd deal with all the states accordingly
            if #available(iOS 13.0, *) {
                switch central.authorization {
                case .denied:
                    os_log("You are not authorized to use Bluetooth")
                case .restricted:
                    os_log("Bluetooth is restricted")
                default:
                    os_log("Unexpected authorization")
                }
            } else {
                // Fallback on earlier versions
            }
            return
        case .unknown:
            os_log("CBManager state is unknown")
            // In a real app, you'd deal with all the states accordingly
            return
        case .unsupported:
            os_log("Bluetooth is not supported on this device")
            // In a real app, you'd deal with all the states accordingly
            return
        @unknown default:
            os_log("A previously unknown central manager state occurred")
            // In a real app, you'd deal with yet unknown cases that might occur in the future
            return
        }
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("Connected to " + peripheral.name!)
        peripheral.delegate = self
        peripheral.discoverServices(nil)
        lblTryingConnect.text = "Connected to: " + peripheral.name!
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        lblTryingConnect.text = "Failed to connect: " + peripheral.name!
        os_log("Failed to connect to %@. %s", peripheral, String(describing: error))
        print(error!)
    }
}

extension ScanViewController : CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            os_log("Error discovering services: %s", error.localizedDescription)
            return
        }
        guard let peripheralServices = peripheral.services else { return }
        for service in peripheralServices {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error {
            os_log("Error discovering characteristics: %s", error.localizedDescription)
            return
        }
        
        guard let serviceCharacteristics = service.characteristics else { return }
        var found = false
        for characteristic in serviceCharacteristics where characteristic.uuid == TransferService.characteristicUUID {
            transferCharacteristic = characteristic
            print("subscribing to characteristic: ", characteristic.uuid)
            peripheral.setNotifyValue(true, for: characteristic)
            found = true
        }
        if found == false {
            lblTryingConnect.text = "No characteristic found: " + peripheral.name!
        } else {
            lblTryingConnect.text = "Found characteristic: " + peripheral.name!
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            os_log("Error changing notification state: %s", error.localizedDescription)
            return
        }
        
        guard characteristic.uuid == TransferService.characteristicUUID else { return }
        
        if characteristic.isNotifying {
            os_log("Notification began on %@", characteristic)
            
            let vc = UIStoryboard(name: "Main", bundle: nil).instantiateViewController(withIdentifier: "ConnectViewController") as! ConnectViewController;
            
            currentPeripheral = peripheral
            self.present(vc, animated: true, completion: nil)
            vc.connectLabel.text = "Connected to: " + (peripheral.name ?? "")
            vc.svc = self
            connectViewController = vc
        } else {
            os_log("Notification stopped on %@. Disconnecting", characteristic)
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            os_log("Error discovering characteristics: %s", error.localizedDescription)
            return
        }
        
        guard let characteristicData = characteristic.value,
              let stringFromData = String(data: characteristicData, encoding: .utf8) else { return }
        
        os_log("Received %d bytes: %s", characteristicData.count, stringFromData)
        connectViewController?.readStrings.append(stringFromData)
        connectViewController?.readView.reloadData()
    }
    
    func writeData(str_to_write : String) {
        if let max_mtu = currentPeripheral?.maximumWriteValueLength(for: .withResponse) {
            os_log("MTU: %d", max_mtu)
        }
        let d = str_to_write.data(using: .ascii).unsafelyUnwrapped
        currentPeripheral?.writeValue(d, for: transferCharacteristic.unsafelyUnwrapped, type: .withResponse)
    }
}
