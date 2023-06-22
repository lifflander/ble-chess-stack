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
import Alamofire

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
    var firstmove : Bool = true
    var gameID : Int = 0
    let baseURL = "https://master.d1qyxtjx2nwnzp.amplifyapp.com/"
    let serverURL = "https://liff.us-west-2.elasticbeanstalk.com/"

    struct GameJSON : Decodable {
        let id : Int
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        readView.dataSource = self
        readView.delegate = self

        UIApplication.shared.isIdleTimerDisabled = true

        let url = URL(string: baseURL)!
        webView.load(URLRequest(url: url))
        webView.allowsBackForwardNavigationGestures = true
    }
    
    @IBAction func writeBtnClick(sender: Any) {
        guard writeText.text != nil else { return }
        let str = writeText.text.unsafelyUnwrapped
        print("Start writing: ", str)
        writeText.text = ""
        svc.writeData(str_to_write: str)
        writeText.endEditing(true)
    }

    func sendMove(move: String) {
        let json : [String: Any] = ["gameID": gameID, "pgn": move]
        let ret = AF.request(serverURL + "moves", method: .post, parameters: json, encoding: JSONEncoding.default)
            .validate()
            .responseJSON{response in
                switch response.result {
                case .success(let response):
                    print(response)
                    self.webView.reload()
                case .failure(let error):
                    print(error.localizedDescription)
                }
            }
    }

    func newMove(move : String) {
        print("newMove: move=", move, " firstmove=", firstmove)
        if firstmove {
            let json : [String: String] = ["title": "auto-gen swift"]
            let ret = AF.request(serverURL + "games", method: .post, parameters: json, encoding: JSONEncoding.default)
                .validate()
                .responseJSON{response in
                    switch response.result {
                    case .success(let res):
                        guard let j = try? JSONDecoder().decode(GameJSON.self, from: response.data!) else { return }
                        self.gameID = j.id
                        print("id", j.id)
                        print(res)
                        self.webView.reload()
                        self.sendMove(move: move)
                    case .failure(let error):
                        print(error.localizedDescription)
                    }
                }
            firstmove = false
        } else {
            self.sendMove(move: move)
        }
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
