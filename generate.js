const fs = require('fs');
const districts = [
  {name:'Bengaluru Urban', lat:12.9716, lng:77.5946, stations:['Cubbon Park PS','Koramangala PS','Whitefield PS','Indiranagar PS','Yelahanka PS']},
  {name:'Mysuru', lat:12.2958, lng:76.6394, stations:['Mysuru North PS','Mysuru South PS','Nazarbad PS','Vijayanagar PS']},
  {name:'Mangaluru', lat:12.9141, lng:74.8560, stations:['Mangaluru East PS','Mangaluru West PS','Bunder PS','Kadri PS']},
  {name:'Belagavi', lat:15.8497, lng:74.4977, stations:['Belagavi City PS','Tilakwadi PS','Udyambag PS','Shahapur PS']},
  {name:'Hubballi', lat:15.3647, lng:75.1240, stations:['Hubballi Town PS','Gokul PS','Vidyanagar PS','Keshwapur PS']},
  {name:'Dharwad', lat:15.4589, lng:75.0078, stations:['Dharwad Town PS','Kalyan Nagar PS','Shivaji Nagar PS']},
  {name:'Shivamogga', lat:13.9299, lng:75.5681, stations:['Shivamogga Town PS','Vinoba Nagar PS','Sagar PS']},
  {name:'Tumakuru', lat:13.3379, lng:77.1173, stations:['Tumakuru Town PS','Tiptur PS','Gubbi PS']},
  {name:'Ballari', lat:15.1394, lng:76.9214, stations:['Ballari Town PS','Sandur PS','Hospet PS']},
  {name:'Kalaburagi', lat:17.3297, lng:76.8343, stations:['Kalaburagi Town PS','Aland PS','Chincholi PS']}
];
const crimeTypes = ['Theft','Vehicle Theft','Robbery','Burglary','Assault','Murder','Cyber Fraud','Kidnapping','Drug Offence','Domestic Violence','Chain Snatching','Missing Person'];
const categories = {
  'Theft':'Property Crime','Vehicle Theft':'Property Crime','Robbery':'Violent Crime',
  'Burglary':'Property Crime','Assault':'Violent Crime','Murder':'Violent Crime',
  'Cyber Fraud':'Cyber Crime','Kidnapping':'Violent Crime','Drug Offence':'Drug Crime',
  'Domestic Violence':'Domestic Crime','Chain Snatching':'Property Crime','Missing Person':'Missing'
};
const statuses = ['Closed','Under Investigation','Chargesheeted','Pending Trial'];
const records = [];
let fir = 1000;
for (let i = 0; i < 600; i++) {
  const d = districts[Math.floor(Math.random() * districts.length)];
  const ct = crimeTypes[Math.floor(Math.random() * crimeTypes.length)];
  const year = 2021 + Math.floor(Math.random() * 5);
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  records.push({
    FIR_Number: 'KA-' + d.name.substring(0,3).toUpperCase() + '-' + year + '-' + fir++,
    Date: year + '-' + month + '-' + day,
    Year: year,
    District: d.name,
    Police_Station: d.stations[Math.floor(Math.random() * d.stations.length)],
    Crime_Type: ct,
    Crime_Category: categories[ct],
    Status: statuses[Math.floor(Math.random() * statuses.length)],
    Arrest_Made: Math.random() > 0.45 ? 'Yes' : 'No',
    Victims: 1 + Math.floor(Math.random() * 4),
    Latitude: parseFloat((d.lat + (Math.random() - 0.5) * 0.3).toFixed(4)),
    Longitude: parseFloat((d.lng + (Math.random() - 0.5) * 0.3).toFixed(4))
  });
}
fs.writeFileSync('d:\\CRIME_ANALYTICS_V\\data\\crimes.json', JSON.stringify(records, null, 2));
console.log('Generated ' + records.length + ' records');
