const demoShopLocationPool = [
    { street: '12 Nguyen Hue', ward: 'Ben Nghe', district: 'District 1', city: 'Ho Chi Minh City', latitude: 10.776889, longitude: 106.700806 },
    { street: '45 Le Loi', ward: 'Ben Thanh', district: 'District 1', city: 'Ho Chi Minh City', latitude: 10.772435, longitude: 106.698171 },
    { street: '28 Pasteur', ward: 'Ben Nghe', district: 'District 1', city: 'Ho Chi Minh City', latitude: 10.780021, longitude: 106.700981 },
    { street: '101 Hai Ba Trung', ward: 'Da Kao', district: 'District 1', city: 'Ho Chi Minh City', latitude: 10.787141, longitude: 106.704406 },
    { street: '233 Dien Bien Phu', ward: 'Vo Thi Sau', district: 'District 3', city: 'Ho Chi Minh City', latitude: 10.783243, longitude: 106.690442 },
    { street: '77 Phan Xich Long', ward: 'Ward 2', district: 'Phu Nhuan', city: 'Ho Chi Minh City', latitude: 10.800053, longitude: 106.684814 },
    { street: '15 Nguyen Van Troi', ward: 'Ward 12', district: 'Phu Nhuan', city: 'Ho Chi Minh City', latitude: 10.798883, longitude: 106.678835 },
    { street: '66 Cong Hoa', ward: 'Ward 4', district: 'Tan Binh', city: 'Ho Chi Minh City', latitude: 10.801654, longitude: 106.653942 },
    { street: '151 Quang Trung', ward: 'Ward 10', district: 'Go Vap', city: 'Ho Chi Minh City', latitude: 10.838063, longitude: 106.667942 },
    { street: '88 Kha Van Can', ward: 'Hiep Binh Chanh', district: 'Thu Duc', city: 'Ho Chi Minh City', latitude: 10.843811, longitude: 106.728074 },
    { street: '220 Vo Van Ngan', ward: 'Binh Tho', district: 'Thu Duc', city: 'Ho Chi Minh City', latitude: 10.850879, longitude: 106.771991 },
    { street: '32 Nguyen Xi', ward: 'Ward 26', district: 'Binh Thanh', city: 'Ho Chi Minh City', latitude: 10.813072, longitude: 106.711447 },
    { street: '59 Bui Vien', ward: 'Pham Ngu Lao', district: 'District 1', city: 'Ho Chi Minh City', latitude: 10.767664, longitude: 106.693773 },
    { street: '199 To Hien Thanh', ward: 'Ward 13', district: 'District 10', city: 'Ho Chi Minh City', latitude: 10.775266, longitude: 106.665692 },
    { street: '135 Cach Mang Thang 8', ward: 'Ward 5', district: 'Tan Binh', city: 'Ho Chi Minh City', latitude: 10.786241, longitude: 106.666443 },
    { street: '30 Shine Street', ward: 'Binh An', district: 'Di An', city: 'Binh Duong', latitude: 10.894582, longitude: 106.792286 },
    { street: '95 Cach Mang Thang Tam', ward: 'Phu Cuong', district: 'Thu Dau Mot', city: 'Binh Duong', latitude: 10.980401, longitude: 106.651856 },
    { street: '368 Tran Hung Dao', ward: 'Dong Hoa', district: 'Di An', city: 'Binh Duong', latitude: 10.877831, longitude: 106.777241 },
    { street: '14 Pham Van Thuan', ward: 'Tan Mai', district: 'Bien Hoa', city: 'Dong Nai', latitude: 10.948509, longitude: 106.822604 },
    { street: '221 Nguyen Ai Quoc', ward: 'Tan Tien', district: 'Bien Hoa', city: 'Dong Nai', latitude: 10.963839, longitude: 106.845773 },
    { street: '123 Pet Street', ward: 'Ben Nghe', district: 'District 1', city: 'Ho Chi Minh City', latitude: 10.774126, longitude: 106.703997 }
];

function buildMapLinks(latitude, longitude) {
    const coords = `${latitude},${longitude}`;
    return {
        googleMapsUrl: `https://www.google.com/maps?q=${encodeURIComponent(coords)}`,
        embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(coords)}&z=15&output=embed`
    };
}

function getDemoShopLocation(index = 0) {
    const base = demoShopLocationPool[index % demoShopLocationPool.length];
    const links = buildMapLinks(base.latitude, base.longitude);

    return {
        address: {
            street: base.street,
            ward: base.ward,
            district: base.district,
            city: base.city
        },
        location: {
            latitude: base.latitude,
            longitude: base.longitude,
            googleMapsUrl: links.googleMapsUrl,
            embedUrl: links.embedUrl
        }
    };
}

module.exports = {
    demoShopLocationPool,
    getDemoShopLocation,
    buildMapLinks
};
