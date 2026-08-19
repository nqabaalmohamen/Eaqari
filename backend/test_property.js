const http = require('http');

const payload = JSON.stringify({
  owner_id: 1,
  type: "شقة",
  operation_type: "sale",
  price: 750000,
  area: 120,
  rooms: 3,
  bathrooms: 2,
  description: "شقة للبيع تشطيب",
  governorate: "الفيوم",
  city: "مدينة الفيوم",
  region: "",
  features: {
    has_electricity: true,
    electricity_count: 1,
    electricity_meter_type: "قانوني",
    has_water: true,
    water_count: 1,
    has_gas: false,
    gas_count: 0,
    is_licensed: true,
    kitchens: 1
  },
  media: [
    { media_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2i0AAAAASUVORK5CYII=", media_type: "image", is_primary: true }
  ]
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/properties',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('HTTP', res.statusCode);
    console.log(data);
  });
});
req.on('error', e => console.error('ERR:', e.message));
req.write(payload);
req.end();
