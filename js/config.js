/* =========================================================
   KONFIGURASI SITUS
   Semua teks, foto, video, musik, dan tanggal diganti dari file ini saja.

   Catatan:
   - Glyph ✦ → ▶ ↺ pada eyebrow dan tombol ditambahkan oleh kode,
     jadi jangan ditulis di sini.
   - Foto yang belum ada otomatis diganti gambar placeholder.
   - Tulis \n di dalam judul scene untuk membuat baris baru,
     contoh: "Happy Birthday\nNama".
   - Untuk melihat satu scene langsung saat mengedit, buka
     index.html?scene=NAMA dengan NAMA salah satu dari:
     countdown, gift, hero, letter, memories, video, wishes, finale
     Pintasan ini hanya aktif selama demoMode: true.
   ========================================================= */
window.SITE = {
  targetDate: "2026-11-28T00:00:00+07:00", // ganti: tanggal ulang tahun, zona WIB
  demoMode: false,                          // true: countdown 10 detik untuk uji alur
  // true : kunci memakai jam internet, jadi tidak bisa dibuka lebih awal dengan
  //        memajukan jam HP. Butuh koneksi internet saat halaman dibuka.
  // false: kunci memakai jam perangkat. Bisa dibuka tanpa internet, tapi bisa diakali.
  onlineClock: true,
  tabTitle: "Sahnaz Birthday",            // judul di tab browser
  music: "assets/music/lagu.mp3",

  countdown: {
    eyebrow: "MENGHITUNG HARI",
    title: ["Sahnaz Special Day", "is Coming"],
    subtitle: "Sesuatu yang indah sedang menunggu untukmu 💗",
    labels: ["HARI", "JAM", "MENIT", "DETIK"],
    waiting: "⏳ Beberapa detik lagi... 💗",
    // Tampil bila jam internet belum terbaca padahal jam perangkat sudah lewat tanggalnya.
    checking: "⏳ Sebentar ya, lagi cek waktunya... pastikan internetmu nyala 💗",
    locked: "🔒 TUNGGU SAMPAI WAKTUNYA 🔒",
    // {mm}:{ss} otomatis melebar jadi jam atau hari bila sisa waktunya masih panjang.
    // Token lain yang tersedia: {dd} dan {hh}.
    remaining: "Tersisa {mm}:{ss} lagi",
    ready: "🎉 Hari ini adalah hari spesial untukmu! 🎉",
    openButton: "OPEN HER GIFT"
  },

  gift: {
    eyebrow: "ADA SESUATU UNTUKMU",
    hint: "✨ klik untuk membuka hadiahmu ✨"
  },

  hero: {
    eyebrow: "A LOVE LETTER FOR YOU",
    title: ["Your", "Special Day"],
    subtitle: "Created with love, just for you",
    button: "READ MY LETTER",
    // Enam foto: tiga pertama di kiri, tiga terakhir di kanan.
    polaroids: [
      "assets/photos/hero-1.jpeg", "assets/photos/hero-2.jpeg", "assets/photos/hero-3.jpeg",
      "assets/photos/hero-4.webp", "assets/photos/hero-5.jpeg", "assets/photos/hero-6.jpeg"
    ]
  },

  letter: {
    title: "Happy Birthday \n Sahnaz Mada Amaral💗",
    greeting: "Haaiii Sayaangg Happyy Birthdayy 💗",
    paragraphs: ["Selamat tambahh usia sayanggkuu 🥳 🥳", 
      "Aku ga jago bikin surat, tulisanku kaya ceker ayam, jadi aku bikinin kata-kata lewat website ini aja yaa..", 
      "Aku tau dewasa ini berat bangeet, banyak sedihnyaa. Tapi ga kalah juga dengan tawanyaa, apaalagii kalo sama aku….", 
      "Sisi kanan dan kiri bahuku siap menjadi tempat sandaran terbaik untukmu di kala kamu cape, sedih, dan menangis. Bajuku juga siap menghapus air matamu..", 
      "Kamu tuntaskan semua tugas kuliaah, bahkan sampai tugas akhir, sementara itu kamu punya tanggung jawab untuk bekerja. Semuaa badai kamu terjang. Kamu hebaat, cantiikkk 🥳 🥳.",
      "Perjuangan kamu sejauh ini itu yang bikin diri kamu bisa berkembang hingga saat ini. Dan akuu banggaaa samaa kamuuuuuu😍😍.",
      "Semogaa di umur yang bertambah ini, kamu bisa menggapai wishlist-wishlist yang sudah kamu catat di catatan handphone kaamuu. Nantii kitaaa wujudiin berduaaa yaa…",
      "Akuu bahagiaa bangeet punya kamuu, tetaapp samaa aku terusss okeeyy ???", 
      "Sampaii ketemuuu nanti yaaa di jadwal yang sudah ditentukaannn, byeeee byeeeee sayaaangg",
          ],
    closing: "Kalo ada yang mau dibuatin jugaaa just call mee @ZhaaBoy",
    button: "OUR MEMORIES"
  },

  memories: {
    title: "Our Memories",
    subtitle: "every moment captured in love",
    // Jumlah bebas, grid menyesuaikan sendiri. Referensi memakai 11 foto.
    photos: [
      "assets/photos/01.jpeg", "assets/photos/02.PNG", "assets/photos/03.PNG", "assets/photos/04.jpeg",
      "assets/photos/05.jpeg", "assets/photos/06.jpeg", "assets/photos/07.jpeg", "assets/photos/08.jpg",
      "assets/photos/09.jpeg", "assets/photos/10.jpeg", "assets/photos/11.jpg"
    ],
    button: "WATCH VIDEO"
  },

  video: {
    title: "A Moment For You",
    subtitle: "a special video message",
    src: "assets/video/moment.mp4",
    poster: "assets/video/poster.jpg",
    button: "BIRTHDAY WISHES"
  },

  wishes: {
    title: "Birthday Wishes",
    greeting: "Happy Birthday, Cantik ❤️",
    body: "Doaku buat kamu tahun ini simpel ajaa. Semoga kamu sehaat teruss, rezekinya lancaar, tidurnya cukuup, dan semua cape kamu kemarin kebayar satu-satuu. Semoga hal-hal baik gantian yang nyamperin kamuu. Dan kalo ada hari yang berat lagi, inget yaa, kamu ga jalan sendiriaan.",
    button: "ONE MORE THING"
  },

  finale: {
    phrases: ["Happy Birthday", "With All My Love", "Always & Forever"],
    lines: [
      "Thank you for being part of my life.",
      "I hope this little gift can make your special day even more beautiful."
    ],
    signature: "Forever yours. 💗",
    button: "REPLAY FROM START"
  }
};
