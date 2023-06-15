//
//  ConnectViewController.swift
//  CoreBluetoothLESample
//
//  Created by Lifflander, Jonathan on 6/1/23.
//  Copyright © 2023 Apple. All rights reserved.
//

import Foundation
import CoreBluetooth
import UIKit
import WebKit

class ReadDataCell : UITableViewCell {
    @IBOutlet weak var lblReadString : UILabel!
}

class ConnectViewController : UIViewController {
    @IBOutlet weak var connectLabel: UILabel!
    @IBOutlet weak var writeText: UITextField!
    @IBOutlet weak var writeBtn: UIButton!
    @IBOutlet weak var readView: UITableView!
    @IBOutlet weak var webView: WKWebView!
    
    var svc : ScanViewController!
    var readStrings : [String] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        readView.dataSource = self
        readView.delegate = self
    }
    
    @IBAction func writeBtnClick(sender: Any) {
        guard writeText.text != nil else { return }
        let str = writeText.text.unsafelyUnwrapped
        print("Start writing: ", str)
        writeText.text = ""
        svc.writeData(str_to_write: str)
        writeText.endEditing(true)
    }
}

extension ConnectViewController : UITableViewDelegate, UITableViewDataSource {
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return readStrings.count
  }
   
  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = self.readView.dequeueReusableCell(withIdentifier: "readDataCell", for: indexPath) as! ReadDataCell
    let str = readStrings[indexPath.row]
    cell.lblReadString.text = str
    return cell
  }

  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    let str = readStrings[indexPath.row]
    print("Details : ", str)
  }
}
