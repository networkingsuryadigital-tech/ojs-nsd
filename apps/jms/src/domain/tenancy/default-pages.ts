export const PRIVACY_POLICY_PAGE_SLUG = "privacy-policy";

export type DefaultJournalPage = {
  slug: string;
  title: string;
  content: string;
};

export function buildDefaultJournalPages(journalName: string): DefaultJournalPage[] {
  return [
    {
      slug: "about",
      title: "Tentang Jurnal",
      content: `# Tentang ${journalName}\n\n${journalName} adalah jurnal ilmiah peer-reviewed yang diterbitkan melalui platform JMS PT. NSD.`,
    },
    {
      slug: "author-guidelines",
      title: "Panduan Penulis",
      content:
        "# Panduan Penulis\n\nPenulis wajib memastikan naskah orisinal, belum pernah diterbitkan, dan mengikuti format sitasi jurnal.",
    },
    {
      slug: "peer-review-policy",
      title: "Kebijakan Peer Review",
      content:
        "# Kebijakan Peer Review\n\nSetiap naskah melalui proses peer review double-blind oleh minimal dua reviewer independen.",
    },
    {
      slug: "focus-and-scope",
      title: "Fokus dan Ruang Lingkup",
      content:
        "# Fokus dan Ruang Lingkup\n\nJurnal menerima artikel penelitian orisinal sesuai bidang keilmuan yang ditetapkan dewan editor.",
    },
    {
      slug: "open-access-policy",
      title: "Kebijakan Open Access",
      content:
        "# Kebijakan Open Access\n\nArtikel diterbitkan dengan akses terbuka setelah proses editorial selesai dan APC (jika berlaku) dibayar.",
    },
    {
      slug: PRIVACY_POLICY_PAGE_SLUG,
      title: "Kebijakan Privasi",
      content:
        `# Kebijakan Privasi\n\n${journalName} memproses data pribadi penulis dan reviewer sesuai Undang-Undang Perlindungan Data Pribadi (UU PDP) Indonesia.\n\n## Data yang dikumpulkan\n\nNama, email, afiliasi, ORCID, serta metadata naskah yang Anda unggah.\n\n## Hak subjek data\n\nAnda dapat meminta ekspor data pribadi melalui menu akun atau menghubungi redaksi jurnal.\n\n## Retensi\n\nNaskah yang ditolak dapat disimpan sesuai kebijakan redaksi; data dapat dihapus atas permintaan sah setelah periode retensi berakhir.`,
    },
  ];
}
