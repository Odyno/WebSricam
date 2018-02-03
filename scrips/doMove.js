const onvif = require('node-onvif');

// Create an OnvifDevice object
let device = new onvif.OnvifDevice({
  xaddr: 'http://192.168.178.37:5000/onvif2/device_service',
  user : 'admin',
  pass : '123456'
});

// Initialize the OnvifDevice object
device.init().then(() => {
  // Move the camera
  return device.ptzMove({
    'speed': {
      x: -1.0, // Speed of pan (in the range of -1.0 to 1.0)
      y: 0.0, // Speed of tilt (in the range of -1.0 to 1.0)
      z: 0.0  // Speed of zoom (in the range of -1.0 to 1.0)
    },

    'timeout': 0 // seconds
  });
}).then(() => {
  console.log('Done!');
}).catch((error) => {
  console.error(error);
});
