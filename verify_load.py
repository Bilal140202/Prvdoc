from playwright.sync_api import sync_playwright
import time

def verify_app_loads():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-features=SharedArrayBuffer'])
        page = browser.new_page()

        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        try:
            print("Navigating to app...")
            page.goto("http://localhost:5173")

            time.sleep(5)

            # Check for error state
            content = page.content()
            if "Initialization Failed" in content:
                print("FAILURE: Initialization Failed found.")
            else:
                print("SUCCESS: App loaded without immediate errors.")

            # We can't easily trigger the WASM error in this environment without a full download
            # but we can verify the app still starts.

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app_loads()
