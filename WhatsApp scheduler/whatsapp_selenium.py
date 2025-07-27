# WhatsApp Scheduler Automation with Selenium
# Requirements: pip install selenium
# Download ChromeDriver from https://sites.google.com/chromium.org/driver/
# Make sure ChromeDriver is in your PATH or specify its location below

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import time
import os
CHROMEDRIVER_PATH = os.path.abspath('chromedriver')

# ---- USER CONFIGURATION ----
# List of messages to send (simulate your HTML table)
scheduled_messages = [
    {
        'name': 'John Doe',
        'phone': '+1234567890',  # Use full international format
        'message': 'Hello from Selenium!',
        'scheduled_time': '2025-07-27 18:00'  # Not used in this script, but you can add scheduling logic
    },
    # Add more dicts for more messages
]



# ---- END USER CONFIGURATION ----

def send_whatsapp_message(phone, message, driver):
    url = f'https://web.whatsapp.com/send?phone={phone.lstrip("+")}&text={message}'
    driver.get(url)
    print(f"Opening chat for {phone}...")
    # Wait for WhatsApp Web to load
    try:
        # Wait for the message box to appear
        for _ in range(60):
            try:
                box = driver.find_element(By.XPATH, '//div[@contenteditable="true"][@data-tab="10"]')
                break
            except:
                time.sleep(1)
        else:
            print("Timeout waiting for WhatsApp Web. Is QR code scanned?")
            return False
        # Click the box and send the message
        box.send_keys(Keys.ENTER)
        print(f"Message sent to {phone}")
        time.sleep(2)
        return True
    except Exception as e:
        print(f"Failed to send message to {phone}: {e}")
        return False

def main():
    options = Options()
    options.add_argument('--user-data-dir=./User_Data')  # Keep session (no need to scan QR every time)
    options.add_argument('--profile-directory=Default')
    driver = webdriver.Chrome(service=Service(CHROMEDRIVER_PATH), options=options)
    driver.maximize_window()
    print("Please scan the QR code in the opened browser window (first time only)...")
    driver.get('https://web.whatsapp.com')
    input("Press Enter after scanning QR code and WhatsApp Web is loaded...")
    for msg in scheduled_messages:
        send_whatsapp_message(msg['phone'], msg['message'], driver)
        time.sleep(5)  # Wait between messages
    print("All messages processed.")
    driver.quit()

if __name__ == '__main__':
    main()
