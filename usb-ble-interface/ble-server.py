
import bleak
import asyncio
import logging
import threading

from bleak import BleakScanner, BleakClient
from bless import BlessServer, BlessGATTCharacteristic, GATTCharacteristicProperties, GATTAttributePermissions
from typing import Any

# char_uuid = "E20A39F4-73F5-4BC4-A12F-17D1AD07A961"
char_uuid = "08590F7E-DB05-467E-8757-72F6FAEB13D4"

def notification_handler(sender, data):
    """Simple notification handler which prints the data received."""
    print ("got data")


async def client():
    # devices = await BleakScanner.discover()
    # for device in devices:
    #     print(device)
    address = "9A3BA2A3-D002-7289-CC9F-8139227A0877" #E20A39F4-73F5-4BC4-A12F-17D1AD07A961"
    async with BleakClient(address) as client:
        print(f"Connected: {client.is_connected}")
        # await client.start_notify(char_uuid, notification_handler)
        await client.write_gatt_char(char_uuid, b'Hello3')
        await asyncio.sleep(4.0)
        # await client.write_gatt_char(char_uuid, b'Hello4')
        # await asyncio.sleep(4.0)

service_uuid = "E20A39F4-73F5-4BC4-A12F-17D1AD07A961"

# asyncio.run(client())

trigger: threading.Event = threading.Event()
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(name=__name__)

def read_request(
        characteristic: BlessGATTCharacteristic,
        **kwargs
        ) -> bytearray:
    logger.debug(f"Reading {characteristic.value}")
    return characteristic.value

prev_value = ""

def write_request(
        characteristic: BlessGATTCharacteristic,
        value: Any,
        **kwargs
        ):
    characteristic.value = value
    logger.debug(f"Char value set to {characteristic.value}")
    # if characteristic.value == b'Test':
    prev_value = characteristic.value
    logger.debug("NICE")
    trigger.set()

async def server(loop):
    my_service_name = "TestXXX"
    server = BlessServer(name=my_service_name, loop=loop)
    server.read_request_func = read_request
    server.write_request_func = write_request

    await server.add_new_service(service_uuid)

    char_flags = (
        GATTCharacteristicProperties.read |
        GATTCharacteristicProperties.write |
        GATTCharacteristicProperties.indicate
    )
    permissions = (
        GATTAttributePermissions.readable |
        GATTAttributePermissions.writeable
    )
    await server.add_new_characteristic(
            service_uuid,
            char_uuid,
            char_flags,
            None,
            permissions)

    await server.start()
    print("Advertising")
    print(f"Write '0xF' to the advertised characteristic: {char_uuid}")


    while True:
        trigger.wait()
        await asyncio.sleep(0.1)
        print("Updating")
        c = server.get_characteristic(char_uuid)
        cur_val = c.value
        c.value = cur_val.extend(b' ok')
        ret = server.update_value(
            service_uuid, char_uuid #"51FF12BB-3ED8-46E5-B4F9-D64E2FEC021B"
        )
        print(f"ret = {ret}")
        trigger.clear()

    # trigger.wait()
    # await asyncio.sleep(2)

    # c.value = b'EOM'
    # ret = server.update_value(
    #     service_uuid, char_uuid #"51FF12BB-3ED8-46E5-B4F9-D64E2FEC021B"
    # )
    # print(f"ret = {ret}")

    await asyncio.sleep(500)
    # await server.stop()

loop = asyncio.get_event_loop()
loop.run_until_complete(server(loop))

