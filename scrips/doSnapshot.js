const onvif = require('node-onvif');

// Create an OnvifDevice object
let device = new onvif.OnvifDevice({
  xaddr: 'http://192.168.178.37:5000/onvif1/device_service'
});


// Initialize the OnvifDevice object
device.init().then(() => {


///ffmpeg -rtsp_transport udp -i 'rtsp://192.168.178.37:554/onvif1' -f image2 -vframes 1 -pix_fmt yuvj420p snapshot.jpeg

///ffmpeg -i 'rtsp://192.168.178.37:554/onvif1' -f image2 -vframes 1 snapshot.jpeg


}).catch((error) => {
  console.error(error);
});
