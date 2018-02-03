const onvif = require('node-onvif');

// Create an OnvifDevice object
let device = new onvif.OnvifDevice({
  xaddr: 'http://192.168.178.37:5000/onvif2/device_service'
});

// Initialize the OnvifDevice object
device.init().then((info) => {
  //Print Device Information
  console.log(JSON.stringify(info, null, '  '));
  // Get the UDP stream URL
  let url = device.getUdpStreamUrl();
  console.log("UdpStreamUrl",url);
  console.log("current profile: ",device.getCurrentProfile());


  let params = {
    'ProfileToken': '2_def_profile6'
  };

  device.services.media.getSnapshotUri(params).then((result) => {
    console.log(JSON.stringify(result['data'], null, '  '));
  }).catch((error) => {
    console.error(error);
  });


}).catch((error) => {
  console.error(error);
});
