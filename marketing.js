const fs = require("fs");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");

// Prisma client oluştur
const prisma = new PrismaClient();

// İzmir'in tüm ilçeleri
const districts = [
    "Altındağ",
    "Çankaya",
    "Etimesgut",
    "Keçiören",
    "Mamak",
    "Sincan",
    "Yenimahalle",
    "Akyurt",
    "Ayaş",
    "Bala",
    "Beypazarı",
    "Çamlıdere",
    "Çubuk",
    "Elmadağ",
    "Evren",
    "Gölbaşı",
    "Güdül",
    "Haymana",
    "Kalecik",
    "Kazan",
    "Kızılcahamam",
    "Nallıhan",
    "Polatlı",
    "Şereflikoçhisar"
  ];
  
  
// İlk sayfadan başlayarak tüm sonuçları almak için bir fonksiyon tanımlayalım
async function getAllResults() {
  let allResults = [];

  // Her bir ilçe için istek yap
  for (const district of districts) {
    let page = 1;

    // Tüm sayfaları dolaş
    while (true) {
      let data = JSON.stringify({
        q: `${district} güzellik merkezi`, // İlçeye göre sorgu oluştur
        gl: "tr",
        hl: "tr",
        page: page,
      });

      let config = {
        method: "post",
        url: "https://google.serper.dev/places",
        headers: {
          "X-API-KEY": "3d9d22f1189711839cc1b4febbfeb1fac3843433",
          "Content-Type": "application/json",
        },
        data: data,
      };

      try {
        const response = await axios(config);
        const pageResults = response.data.places;

        if (pageResults.length === 0) {
          // Sayfa sonucu boşsa döngüden çık
          break;
        }

        // Tüm sonuçları birleştir
        allResults = allResults.concat(pageResults);
        page++;
      } catch (error) {
        console.log(error);
        break;
      }
    }
  }

  return allResults;
}

// Tüm sonuçları al ve birleştir
getAllResults()
  .then(async (results) => {
    // Tag'leri ve il ismini tanımla
    const googleMarketingTag = "google marketing";

    // Her bir sonucu işle
    const customers = results.map((place) => {
      // Telefon numarasındaki parantezleri ve boşlukları sil
      const phone = place.phoneNumber
        ? place.phoneNumber.replace(/[()\s]/g, "")
        : "";
      // Telefon numarasının "05" ile başlayıp başlamadığını kontrol et
      const isStartingWith05 = phone.startsWith("05");
      // CustomerTags listesine uygun etiketleri ekle
      let customerTags = [];
      if (!phone) {
        customerTags.push("no number");
      } else if (!isStartingWith05) {
        customerTags.push("fixed number");
      } else {
        customerTags.push("whatsapp user");
      }
      // Müşteriye "google marketing" etiketini ekle
      customerTags.push(googleMarketingTag);
      // Customer objesini oluştur ve dön
      return {
        name: place.title,
        address: place.address || "", // Adres bilgisi yoksa boş bir dize ata
        lat: place.latitude || 0,
        long: place.longitude || 0,
        category: place.category || "",
        phone: phone || "",
        type: "potential",
        tags: customerTags,
        province: `ankara`, // İlçe-izmir formatında ilçe bilgisini ve İzmir'i birleştir
      };
    });

    // Tüm müşterileri veritabanına kaydet
    for (const customer of customers) {
      // Aynı isimde başka bir müşteri varsa kaydetme
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          name: customer.name, // Yeni müşterinin adı ile eşleşen müşteriyi bul
        },
      });

      // Eğer existingCustomer null değilse, yani aynı isimde başka bir müşteri varsa, kaydetme
      if (!existingCustomer) {
        await prisma.customer.create({
          data: customer,
        });
      }
    }

    console.log("All customers successfully saved to the database");
  })
  .catch((error) => {
    console.log(error);
  });