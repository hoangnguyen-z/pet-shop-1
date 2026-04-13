const PET_TYPE_LABELS = {
    dog: 'chó',
    cat: 'mèo',
    bird: 'chim',
    fish: 'cá',
    rabbit: 'thỏ',
    hamster: 'hamster',
    reptile: 'bò sát',
    'small-pet': 'thú nhỏ',
    'all-pets': 'thú cưng'
};

const CATEGORY_LABELS = {
    Dog: 'Chó',
    Cat: 'Mèo',
    Bird: 'Chim',
    Fish: 'Cá',
    Rabbit: 'Thỏ',
    Hamster: 'Hamster',
    Reptile: 'Bò sát',
    'Small Pet': 'Thú nhỏ',
    Grooming: 'Chăm sóc thú cưng',
    'Homes & Habitats': 'Nhà ở & chuồng nuôi',
    'Premium Dog Food': 'Thức ăn cao cấp cho chó',
    'Luxury Cat Supplies': 'Đồ dùng cao cấp cho mèo',
    'Bird Homes': 'Nhà ở cho chim',
    'Aquarium Supplies': 'Đồ thủy sinh',
    'Reptile Gear': 'Phụ kiện bò sát',
    'Small Mammal Supplies': 'Đồ dùng cho thú có vú nhỏ',
    'Pet Health': 'Sức khỏe thú cưng',
    'Pet Fashion': 'Thời trang thú cưng',
    'Training Supplies': 'Dụng cụ huấn luyện',
    'Cleaning & Care': 'Vệ sinh & chăm sóc',
    'Dog Food': 'Thức ăn cho chó',
    'Cat Food': 'Thức ăn cho mèo',
    Treats: 'Bánh thưởng',
    Toys: 'Đồ chơi',
    'Bird Supplies': 'Đồ dùng cho chim',
    'Fish Supplies': 'Đồ dùng cho cá'
};

const PRODUCT_TYPE_LABELS = {
    'Adult Dog Food': 'Thức ăn cho chó trưởng thành',
    'Puppy Food': 'Thức ăn cho chó con',
    'Dental Chews': 'Xương gặm chăm sóc răng',
    'Rubber Chew Toy': 'Đồ chơi gặm cao su',
    'Dog Bed': 'Đệm ngủ cho chó',
    'Dog House': 'Nhà cho chó',
    'Leash Set': 'Bộ dây dắt',
    'Training Treats': 'Bánh thưởng huấn luyện',
    Shampoo: 'Dầu gội thú cưng',
    'Travel Crate': 'Chuồng vận chuyển',
    'Food Bowl': 'Bát ăn',
    'Health Supplement': 'Thực phẩm bổ sung sức khỏe',
    'Indoor Cat Food': 'Thức ăn cho mèo trong nhà',
    'Kitten Food': 'Thức ăn cho mèo con',
    'Clumping Litter': 'Cát vệ sinh vón cục',
    'Cat Tree': 'Cây leo cho mèo',
    'Cat Scratcher': 'Trụ cào móng cho mèo',
    'Interactive Wand Toy': 'Cần câu đồ chơi tương tác',
    'Covered Litter Box': 'Khay vệ sinh có nắp',
    'Cat Carrier': 'Túi vận chuyển mèo',
    'Hairball Treats': 'Bánh thưởng hỗ trợ tiêu búi lông',
    'Wet Food Pouch': 'Túi thức ăn ướt',
    'Cat Tunnel': 'Đường hầm cho mèo',
    'Grooming Brush': 'Bàn chải chải lông',
    'Parakeet Seed Mix': 'Hỗn hợp hạt cho vẹt yến phụng',
    'Cockatiel Food': 'Thức ăn cho vẹt cockatiel',
    'Bird Cage Small': 'Lồng chim cỡ nhỏ',
    'Bird Cage Large': 'Lồng chim cỡ lớn',
    'Wooden Perch Set': 'Bộ cầu đậu gỗ',
    'Mineral Block': 'Đá khoáng',
    'Swing Toy': 'Đồ chơi xích đu',
    'Seed Cup': 'Cốc đựng hạt',
    'Bath Tub': 'Khay tắm',
    'Nest Box': 'Hộp làm tổ',
    'Millet Spray': 'Kê chùm',
    'Travel Cage': 'Lồng vận chuyển',
    'Tropical Fish Flakes': 'Thức ăn mảnh cho cá nhiệt đới',
    'Goldfish Pellets': 'Thức ăn viên cho cá vàng',
    'Aquarium Filter': 'Bộ lọc hồ cá',
    'LED Aquarium Light': 'Đèn LED hồ cá',
    'Water Conditioner': 'Dung dịch xử lý nước',
    'Aquarium Gravel': 'Sỏi hồ cá',
    'Air Pump': 'Máy sủi khí',
    'Fish Net': 'Vợt bắt cá',
    'Tank Heater': 'Máy sưởi bể cá',
    'Decor Plant Set': 'Bộ cây trang trí',
    'Betta Food': 'Thức ăn cho cá betta',
    'Glass Fish Bowl': 'Bể cá thủy tinh',
    'Timothy Hay': 'Cỏ Timothy',
    'Rabbit Pellets': 'Thức ăn viên cho thỏ',
    'Rabbit Cage': 'Chuồng thỏ',
    'Wooden Hideout': 'Nhà trú ẩn bằng gỗ',
    'Chew Sticks': 'Que gặm',
    'Water Bottle': 'Bình nước',
    'Food Dish': 'Đĩa ăn',
    'Litter Tray': 'Khay vệ sinh',
    'Play Tunnel': 'Đường hầm vui chơi',
    'Grooming Comb': 'Lược chải lông',
    'Alfalfa Treats': 'Bánh thưởng cỏ linh lăng',
    'Portable Carrier': 'Lồng xách tay',
    'Hamster Food Mix': 'Hỗn hợp thức ăn cho hamster',
    'Hamster Cage': 'Lồng hamster',
    'Exercise Wheel': 'Bánh xe chạy',
    'Wood Bedding': 'Mùn lót chuồng gỗ',
    'Sand Bath': 'Cát tắm',
    'Hideout House': 'Nhà trú ẩn',
    'Chew Blocks': 'Khối gặm',
    'Water Bottle Mini': 'Bình nước mini',
    'Food Bowl Mini': 'Bát ăn mini',
    'Play Tube Set': 'Bộ ống vui chơi',
    'Carry Pod': 'Khoang xách thú cưng',
    'Seed Treat Bar': 'Thanh bánh hạt',
    'Terrarium Glass Tank': 'Bể kính terrarium',
    'Heat Lamp': 'Đèn sưởi',
    'UVB Bulb': 'Bóng UVB',
    'Reptile Calcium': 'Canxi cho bò sát',
    'Substrate Mat': 'Thảm lót nền',
    'Water Dish': 'Khay nước',
    'Hide Cave': 'Hang trú ẩn',
    'Climbing Branch': 'Cành leo',
    Thermometer: 'Nhiệt kế',
    'Humidity Gauge': 'Đồng hồ đo độ ẩm',
    'Turtle Food': 'Thức ăn cho rùa',
    'Feeding Tongs': 'Kẹp gắp thức ăn',
    'Guinea Pig Pellets': 'Thức ăn viên cho chuột lang',
    'Small Pet Hay Rack': 'Giá để cỏ cho thú nhỏ',
    'Large Playpen': 'Cũi quây cỡ lớn',
    'Corner Toilet': 'Khay vệ sinh góc',
    'Soft Bedding': 'Đệm lót mềm',
    'Vitamin Drops': 'Giọt vitamin',
    'Cuddle Bed': 'Đệm ngủ êm',
    'Wooden Bridge': 'Cầu gỗ',
    'Small Pet Harness': 'Dây yếm cho thú nhỏ',
    'Nail Clippers': 'Kềm cắt móng',
    'Treat Mix': 'Hỗn hợp bánh thưởng',
    'Cleaning Spray': 'Xịt làm sạch',
    'Dog Shampoo': 'Dầu gội cho chó',
    'Cat Shampoo': 'Dầu gội cho mèo',
    'Slicker Brush': 'Bàn chải gỡ rối',
    'Nail Clipper': 'Kềm cắt móng',
    'Ear Cleaner': 'Dung dịch vệ sinh tai',
    'Paw Balm': 'Sáp dưỡng chân',
    'Toothbrush Kit': 'Bộ bàn chải răng',
    'Pet Wipes': 'Khăn lau thú cưng',
    'Deodorizing Spray': 'Xịt khử mùi',
    'Grooming Glove': 'Găng tay chải lông',
    'Deshedding Tool': 'Dụng cụ giảm rụng lông',
    'Dry Towel': 'Khăn lau khô',
    'Wooden Dog House': 'Nhà gỗ cho chó',
    'Cat Condo': 'Nhà leo cho mèo',
    'Bird Aviary': 'Chuồng chim aviary',
    'Rabbit Hutch': 'Chuồng thỏ ngoài trời',
    'Hamster Mansion Cage': 'Lồng hamster nhiều tầng',
    'Reptile Terrarium': 'Hồ nuôi bò sát',
    'Portable Pet Tent': 'Lều thú cưng di động',
    'Soft Pet Bed': 'Đệm ngủ mềm',
    'Outdoor Playpen': 'Cũi quây ngoài trời',
    'Travel Carrier': 'Túi vận chuyển',
    'Plastic Kennel': 'Chuồng nhựa',
    'Foldable Crate': 'Chuồng gấp gọn',
    'Grain Free Adult Food': 'Thức ăn trưởng thành không ngũ cốc',
    'Sensitive Skin Kibble': 'Hạt cho da nhạy cảm',
    'Large Breed Puppy Food': 'Thức ăn cho chó con giống lớn',
    'Senior Dog Nutrition': 'Dinh dưỡng cho chó lớn tuổi',
    'Freeze Dried Chicken Treats': 'Bánh thưởng gà sấy đông khô',
    'Salmon Training Bites': 'Bánh thưởng cá hồi huấn luyện',
    'Dental Care Chews': 'Xương gặm chăm sóc răng',
    'Joint Support Soft Chews': 'Viên nhai mềm hỗ trợ khớp',
    'Slow Feeder Bowl': 'Bát ăn chậm',
    'Measuring Scoop Set': 'Bộ muỗng đong',
    'Fresh Food Topper': 'Topping thức ăn tươi',
    'High Protein Snack Pack': 'Gói snack giàu đạm',
    'Premium Wet Food Set': 'Bộ thức ăn ướt cao cấp',
    'Hairball Control Kibble': 'Hạt kiểm soát búi lông',
    'Luxury Cat Tree': 'Cây leo cao cấp cho mèo',
    'Window Hammock': 'Võng cửa sổ',
    'Tofu Cat Litter': 'Cát đậu hũ cho mèo',
    'Automatic Water Fountain': 'Máy nước uống tự động',
    'Stainless Food Bowl': 'Bát ăn inox',
    'Calming Cat Bed': 'Đệm ngủ thư giãn cho mèo',
    'Tunnel Toy': 'Đồ chơi đường hầm',
    'Catnip Mouse Pack': 'Bộ chuột catnip',
    'Travel Backpack Carrier': 'Ba lô vận chuyển thú cưng',
    'Self Grooming Brush': 'Bàn chải tự chải',
    'Canary Seed Blend': 'Hỗn hợp hạt cho chim hoàng yến',
    'Parrot Pellet Mix': 'Hỗn hợp viên cho vẹt',
    'Tall Bird Cage': 'Lồng chim cao',
    'Breeding Nest Box': 'Hộp làm tổ sinh sản',
    'Natural Perch Bundle': 'Bộ cầu đậu tự nhiên',
    'Rope Climbing Toy': 'Đồ chơi dây leo',
    'Foraging Ball': 'Bóng tìm thức ăn',
    'Mirror Bell Toy': 'Đồ chơi gương chuông',
    'Cuttlebone Holder': 'Giá giữ mai mực',
    'Bird Bath Tray': 'Khay tắm chim',
    'Cage Cleaning Spray': 'Xịt vệ sinh lồng',
    'Outdoor Travel Cage': 'Lồng vận chuyển ngoài trời',
    'Nano Aquarium Kit': 'Bộ hồ cá nano',
    'Planted Tank Substrate': 'Nền thủy sinh',
    'Aquarium CO2 Diffuser': 'Bộ khuếch tán CO2 hồ cá',
    'Bio Filter Media': 'Vật liệu lọc sinh học',
    'Betta Leaf Hammock': 'Lá nghỉ cho cá betta',
    'Premium Fish Flakes': 'Thức ăn mảnh cao cấp cho cá',
    'Shrimp Mineral Food': 'Thức ăn khoáng cho tép',
    'Water Test Kit': 'Bộ kiểm tra nước',
    'Aquarium Thermometer': 'Nhiệt kế hồ cá',
    'Glass Cleaner Magnet': 'Nam châm lau kính',
    'Aquascape Rock Set': 'Bộ đá thủy sinh',
    'Live Plant Fertilizer': 'Phân bón cây thủy sinh',
    'Desert Terrarium Kit': 'Bộ terrarium sa mạc',
    'Rainforest Habitat Kit': 'Bộ chuồng môi trường rừng mưa',
    'UVB Lighting Combo': 'Bộ đèn UVB',
    'Ceramic Heat Emitter': 'Bóng sưởi gốm',
    'Digital Thermostat': 'Bộ điều nhiệt điện tử',
    'Reptile Misting Bottle': 'Bình phun sương cho bò sát',
    'Coconut Fiber Substrate': 'Nền xơ dừa',
    'Gecko Diet Powder': 'Bột thức ăn cho gecko',
    'Turtle Dock Ramp': 'Dốc lên bến cho rùa',
    'Basking Platform': 'Bệ phơi nắng',
    'Decor Vine Pack': 'Bộ dây leo trang trí',
    'Feeding Cup Holder': 'Giá giữ cốc thức ăn',
    'Guinea Pig Hay Blend': 'Hỗn hợp cỏ cho chuột lang',
    'Chinchilla Bath Sand': 'Cát tắm cho chinchilla',
    'Ferret Hammock Bed': 'Võng ngủ cho chồn sương',
    'Multi Level Cage': 'Lồng nhiều tầng',
    'Chew Tunnel Bridge': 'Cầu hầm gặm',
    'Small Animal Playpen': 'Cũi quây cho thú nhỏ',
    'Vitamin C Drops': 'Giọt vitamin C',
    'Natural Bedding Pack': 'Gói đệm lót tự nhiên',
    'Ceramic Food Bowl': 'Bát ăn gốm',
    'No Drip Water Bottle': 'Bình nước chống rò',
    'Forage Mix Treats': 'Bánh thưởng hạt cỏ',
    'Hideout Grass House': 'Nhà cỏ trú ẩn',
    'Flea Tick Protection': 'Bảo vệ ve rận',
    'Ear Cleaning Solution': 'Dung dịch làm sạch tai',
    'Dental Water Additive': 'Dung dịch chăm sóc răng pha nước',
    'Multivitamin Tablets': 'Viên đa vitamin',
    'Probiotic Powder': 'Bột men vi sinh',
    'Wound Care Spray': 'Xịt chăm sóc vết thương',
    'Eye Wash Solution': 'Dung dịch rửa mắt',
    'Calming Supplement': 'Thực phẩm bổ sung thư giãn',
    'Joint Care Chews': 'Viên nhai chăm sóc khớp',
    'Paw Repair Balm': 'Sáp phục hồi bàn chân',
    'Pet First Aid Kit': 'Bộ sơ cứu thú cưng',
    'Digital Pet Thermometer': 'Nhiệt kế điện tử cho thú cưng',
    'Rain Jacket': 'Áo mưa',
    'Warm Hoodie': 'Áo hoodie giữ ấm',
    'Cooling Vest': 'Áo làm mát',
    'Reflective Harness': 'Áo yếm phản quang',
    'Cute Bandana Set': 'Bộ khăn bandana',
    'Leather Collar': 'Vòng cổ da',
    'Adjustable Leash': 'Dây dắt điều chỉnh',
    'Winter Sweater': 'Áo len mùa đông',
    'Birthday Costume': 'Trang phục sinh nhật',
    'Travel Harness': 'Áo yếm du lịch',
    'Pet Socks': 'Tất cho thú cưng',
    'Bow Tie Collar': 'Vòng cổ nơ',
    'Clicker Training Kit': 'Bộ clicker huấn luyện',
    'Treat Pouch Bag': 'Túi đựng bánh thưởng',
    'Puzzle Feeder Toy': 'Đồ chơi ăn chậm giải đố',
    'Long Training Leash': 'Dây dắt huấn luyện dài',
    'Agility Cone Set': 'Bộ cọc huấn luyện',
    'Recall Whistle': 'Còi gọi về',
    'Training Reward Treats': 'Bánh thưởng huấn luyện',
    'No Pull Harness': 'Áo yếm chống kéo',
    'Interactive Snuffle Mat': 'Thảm tìm mồi tương tác',
    'Potty Training Pads': 'Tấm lót huấn luyện đi vệ sinh',
    'Dog Training Book': 'Sách huấn luyện chó',
    'Command Target Stick': 'Que target huấn luyện',
    'Odor Eliminator Spray': 'Xịt khử mùi',
    'Stain Remover Foam': 'Bọt tẩy vết bẩn',
    'Biodegradable Poop Bags': 'Túi đựng phân tự phân hủy',
    'Cat Litter Deodorizer': 'Khử mùi cát mèo',
    'Pet Laundry Detergent': 'Nước giặt đồ thú cưng',
    'Grooming Wipes': 'Khăn lau chải chuốt',
    'Disinfectant Floor Cleaner': 'Nước lau sàn khử khuẩn',
    'Portable Waste Bin': 'Thùng rác di động',
    'Lint Roller Pack': 'Bộ cây lăn lông',
    'Pet Hair Vacuum Brush': 'Đầu chải hút lông',
    'Travel Cleaning Kit': 'Bộ vệ sinh du lịch',
    'Paw Cleaning Cup': 'Cốc rửa chân',
    'Life Protection Adult Dog Food': 'Life Protection cho chó trưởng thành',
    'Indoor Advantage Dry Cat Food': 'Indoor Advantage cho mèo trong nhà',
    'Adult Complete Nutrition Dog Treats': 'Complete Nutrition cho chó trưởng thành',
    'Forti-Diet Pro Health Bird Food': 'Forti-Diet Pro Health cho chim',
    'Kong Classic Dog Toy': 'Kong Classic cho chó'
};

const ATTRIBUTE_NAME_LABELS = {
    'Pet Type': 'Loại thú cưng',
    'Product Type': 'Loại sản phẩm',
    Brand: 'Thương hiệu'
};

const PET_GROUP_CATEGORIES = new Set(['Chó', 'Mèo', 'Chim', 'Cá', 'Thỏ', 'Hamster', 'Bò sát', 'Thú nhỏ', 'Thú cưng']);

function cleanText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function translatePetTypeToVi(value) {
    const key = cleanText(value).toLowerCase();
    return PET_TYPE_LABELS[key] || cleanText(value);
}

function translateCategoryNameToVi(value) {
    const key = cleanText(value);
    return CATEGORY_LABELS[key] || key;
}

function translateProductTypeToVi(value) {
    const key = cleanText(value);
    return PRODUCT_TYPE_LABELS[key] || key;
}

function translateProductNameToVi(name, brand) {
    const cleanName = cleanText(name);
    if (!cleanName) return cleanName;

    const direct = PRODUCT_TYPE_LABELS[cleanName];
    if (direct) return direct;

    const cleanBrand = cleanText(brand);
    if (cleanBrand && cleanName.startsWith(`${cleanBrand} `)) {
        const productType = cleanName.slice(cleanBrand.length + 1);
        const translatedType = translateProductTypeToVi(productType);
        if (translatedType !== productType) {
            return `${cleanBrand} ${translatedType}`;
        }
    }

    return cleanName;
}

function buildShortDescriptionVi({ translatedName, translatedCategory, translatedPetType }) {
    if (translatedCategory && !PET_GROUP_CATEGORIES.has(translatedCategory)) {
        return `${translatedName} thuộc nhóm ${translatedCategory.toLowerCase()}, phù hợp cho nhu cầu sử dụng hằng ngày.`;
    }

    if (translatedPetType) {
        return `${translatedName} phù hợp cho ${translatedPetType}, tiện dùng trong chăm sóc hằng ngày.`;
    }

    return `${translatedName} phù hợp cho nhu cầu sử dụng hằng ngày của thú cưng.`;
}

function buildDescriptionVi({ translatedName, brand, translatedCategory, translatedPetType }) {
    const audience = translatedPetType ? `dành cho ${translatedPetType}` : 'dành cho thú cưng';
    const categoryLine = translatedCategory && !PET_GROUP_CATEGORIES.has(translatedCategory)
        ? `thuộc nhóm ${translatedCategory.toLowerCase()}`
        : 'phù hợp cho nhu cầu chăm sóc hằng ngày';
    const brandLine = brand ? ` từ ${brand}` : '';
    return `${translatedName}${brandLine} là sản phẩm ${audience}, ${categoryLine}, đáp ứng nhu cầu chăm sóc, nuôi dưỡng và sinh hoạt hằng ngày trên sàn thú cưng.`;
}

function localizeAttributesToVi(attributes = []) {
    return attributes.map((attribute) => {
        const localized = { ...attribute };
        localized.name = ATTRIBUTE_NAME_LABELS[localized.name] || localized.name;

        if (attribute.name === 'Pet Type') {
            localized.value = translatePetTypeToVi(attribute.value);
        } else if (attribute.name === 'Product Type') {
            localized.value = translateProductTypeToVi(attribute.value);
        } else if (attribute.name === 'Brand') {
            localized.value = cleanText(attribute.value);
        }

        return localized;
    });
}

function localizeProductToVi(product = {}) {
    const translatedCategory = translateCategoryNameToVi(product.categoryName || product.categoryLabel || product.category);
    const translatedPetType = translatePetTypeToVi(product.petType || product.primaryPetType || product.pet);
    const translatedName = translateProductNameToVi(product.name, product.brand);

    return {
        name: translatedName,
        shortDescription: buildShortDescriptionVi({
            translatedName,
            translatedCategory,
            translatedPetType
        }),
        description: buildDescriptionVi({
            translatedName,
            brand: cleanText(product.brand),
            translatedCategory,
            translatedPetType
        }),
        attributes: localizeAttributesToVi(product.attributes || [])
    };
}

function localizeCategoryToVi(category = {}) {
    const translatedName = translateCategoryNameToVi(category.name);
    return {
        name: translatedName,
        description: `${translatedName} phù hợp cho nhu cầu mua sắm và chăm sóc thú cưng hằng ngày.`
    };
}

module.exports = {
    cleanText,
    translatePetTypeToVi,
    translateCategoryNameToVi,
    translateProductTypeToVi,
    translateProductNameToVi,
    localizeAttributesToVi,
    localizeProductToVi,
    localizeCategoryToVi
};
