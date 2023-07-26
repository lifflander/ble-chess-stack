
import bleak
import asyncio
import logging
import threading
import multiprocessing
import queue

from bleak import BleakScanner, BleakClient
from bless import BlessServer, BlessGATTCharacteristic, GATTCharacteristicProperties, GATTAttributePermissions
from typing import Any

QUEUE_TO_BLETOOL = None

char_uuid = "08590F7E-DB05-467E-8757-72F6FAEB13D4"
service_uuid = "E20A39F4-73F5-4BC4-A12F-17D1AD07A961"

trigger: threading.Event = threading.Event()
#logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(name=__name__)

def read_request(
        characteristic: BlessGATTCharacteristic,
        **kwargs
        ) -> bytearray:
    logger.debug(f"Reading {characteristic.value}")
    return characteristic.value

def write_request(
        characteristic: BlessGATTCharacteristic,
        value: Any,
        **kwargs
        ):
    characteristic.value = value
    logger.debug(f"Char value set to {characteristic.value}")
    # if characteristic.value == b'Test':
    logger.debug("NICE")
    trigger.set()

def startBLETool():
    global QUEUE_TO_BLETOOL

    logger.debug("Launching BLE tool in separate process")
    QUEUE_TO_BLETOOL = multiprocessing.Queue(maxsize=256)
    thread = multiprocessing.Process(
        target=startServer,
        args=(10, QUEUE_TO_BLETOOL),
        daemon=True,
    )
    thread.start()

    return QUEUE_TO_BLETOOL

async def server(loop, queue):

    my_service_name = "BleChess"
    server = BlessServer(name=my_service_name, loop=loop)
    server.read_request_func = read_request
    server.write_request_func = write_request

    await server.add_new_service(service_uuid)

    char_flags = (
        GATTCharacteristicProperties.read |
        GATTCharacteristicProperties.write |
        GATTCharacteristicProperties.notify
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

    while not await server.is_connected():
        await asyncio.sleep(0.1)

    print("Subscription occurred")

    first_time = True

    while True:
        await asyncio.sleep(0.1)

        message = queue.get()
        print("Got message")

        c = server.get_characteristic(char_uuid)
        c.value = message

        while not await server.is_connected():
            await asyncio.sleep(0.1)

        print("Connected")

        ret = server.update_value(
            service_uuid, char_uuid #"51FF12BB-3ED8-46E5-B4F9-D64E2FEC021B"
        )
        print(f"ret = {ret}")
        await asyncio.sleep(0.3)

    await asyncio.sleep(500)

def startServer(test, queue):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(server(loop, queue))

