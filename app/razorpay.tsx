//app/RazorpayScreen.tsx (Expo Router project)
import React, { useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const RazorpayScreen = () => {
  const webviewRef = useRef(null);

  // Replace with your Razorpay key
  const RAZORPAY_KEY = 'rzp_test_YourKeyHere';

  // Replace these with dynamic values
  const amountInPaise = 50000; // ₹500 => must be in paise
  const customerEmail = 'customer@example.com';
  const customerName = 'Test User';
  const contactNumber = '9999999999';

  // This HTML triggers Razorpay checkout
  const razorpayHtml = `
    <html>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body onload="payNow()">
        <script>
          function payNow() {
            var options = {
              key: "${RAZORPAY_KEY}",
              amount: "${amountInPaise}",
              currency: "INR",
              name: "Smart Tiffin Service",
              description: "Tiffin Payment",
              handler: function (response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ success: true, data: response }));
              },
              prefill: {
                name: "${customerName}",
                email: "${customerEmail}",
                contact: "${contactNumber}"
              },
              theme: {
                color: "#3399cc"
              }
            };
            var rzp = new Razorpay(options);
            rzp.open();
          }
        </script>
      </body>
    </html>
  `;

  const onMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.success) {
      // ✅ Navigate to success screen or update order
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: razorpayHtml }}
        onMessage={onMessage}
        startInLoadingState
        renderLoading={() => (
          <ActivityIndicator
            color="#2c95f8"
            size="large"
            style={{ flex: 1, justifyContent: 'center' }}
          />
        )}
      />
    </View>
  );
};

export default RazorpayScreen;
