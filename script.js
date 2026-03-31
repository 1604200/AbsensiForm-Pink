document.addEventListener("DOMContentLoaded", () => {
  initParallax();
  initMagneticButtons();
  initCardHoverTilt();
  initAttendancePage();
});

/* =========================
   GLOBAL UI ANIMATION
========================= */
function initParallax() {
  const items = document.querySelectorAll(".parallax");
  if (!items.length) return;

  window.addEventListener("mousemove", (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;

    items.forEach((item) => {
      const speed = Number(item.dataset.speed || 1);
      item.style.transform = `translate(${x * speed * 0.15}px, ${y * speed * 0.15}px)`;
    });
  });

  window.addEventListener("mouseleave", () => {
    items.forEach((item) => {
      item.style.transform = "translate(0, 0)";
    });
  });
}

function initMagneticButtons() {
  const magnets = document.querySelectorAll(".magnetic");

  magnets.forEach((button) => {
    if (button.dataset.magneticBound === "true") return;
    button.dataset.magneticBound = "true";

    button.addEventListener("mousemove", (e) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px) scale(1.02)`;
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "translate(0, 0) scale(1)";
    });
  });
}

function initCardHoverTilt() {
  const cards = document.querySelectorAll(".hero-card, .attendance-frame");

  cards.forEach((card) => {
    if (card.dataset.tiltBound === "true") return;
    card.dataset.tiltBound = "true";

    card.addEventListener("mousemove", (e) => {
      if (window.innerWidth < 768) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rotateY = ((x / rect.width) - 0.5) * 3;
      const rotateX = ((y / rect.height) - 0.5) * -3;

      card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
    });
  });
}

/* =========================
   ATTENDANCE PAGE LOGIC
========================= */
function initAttendancePage() {
  const attendanceForm = document.getElementById("attendanceForm");
  if (!attendanceForm) return;

  const STORAGE_KEY = "attendance_records_camera_v6";
  const ACTIVE_CARD_KEY = "attendance_active_card_v6";

  const cameraVideo = document.getElementById("cameraVideo");
  const captureCanvas = document.getElementById("captureCanvas");
  const startCameraBtn = document.getElementById("startCameraBtn");
  const scanCameraBtn = document.getElementById("scanCameraBtn");
  const stopCameraBtn = document.getElementById("stopCameraBtn");
  const resetScanBtn = document.getElementById("resetScanBtn");
  const cameraStatus = document.getElementById("cameraStatus");
  const scannedIdPreview = document.getElementById("scannedIdPreview");

  const studentNameInput = document.getElementById("studentName");
  const studentNimInput = document.getElementById("studentNim");
  const studentMajorInput = document.getElementById("studentMajor");

  const cardCodeDisplay = document.getElementById("cardCodeDisplay");
  const manualCardCode = document.getElementById("manualCardCode");
  const dayNumberInput = document.getElementById("dayNumber");
  const attendanceDateInput = document.getElementById("attendanceDate");
  const attendanceStatusInput = document.getElementById("attendanceStatus");

  const filterCardCode = document.getElementById("filterCardCode");
  const filterStatus = document.getElementById("filterStatus");
  const filterMonth = document.getElementById("filterMonth");
  const filterExactDate = document.getElementById("filterExactDate");
  const filterDateFrom = document.getElementById("filterDateFrom");
  const filterDateTo = document.getElementById("filterDateTo");
  const applyFilterBtn = document.getElementById("applyFilterBtn");
  const resetFilterBtn = document.getElementById("resetFilterBtn");

  const activeCardBadge = document.getElementById("activeCardBadge");
  const dataCount = document.getElementById("dataCount");
  const filteredCount = document.getElementById("filteredCount");
  const printFilterInfo = document.getElementById("printFilterInfo");

  const printStudentName = document.getElementById("printStudentName");
  const printStudentNim = document.getElementById("printStudentNim");
  const printStudentMajor = document.getElementById("printStudentMajor");
  const printCardCode = document.getElementById("printCardCode");
  const printTimestamp = document.getElementById("printTimestamp");

  const tableBody = document.getElementById("attendanceTableBody");
  const jsonOutput = document.getElementById("jsonOutput");

  const clearAllBtn = document.getElementById("clearAllBtn");
  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const copyJsonBtn = document.getElementById("copyJsonBtn");
  const printPdfBtn = document.getElementById("printPdfBtn");

  let stream = null;
  let attendanceData = getStoredRecords();
  let activeCardCode = getStoredActiveCard();
  let filteredData = [];

  setTodayDate();
  hydrateActiveCard();
  setNextDayNumber();
  autoFillParticipantFromCard();
  applyFiltersAndRender();

  startCameraBtn.addEventListener("click", startCamera);
  stopCameraBtn.addEventListener("click", stopCamera);
  scanCameraBtn.addEventListener("click", scanFromCamera);

  resetScanBtn.addEventListener("click", () => {
    activeCardCode = "";
    saveActiveCard("");
    manualCardCode.value = "";
    updateScannedCardDisplay("");
    setNextDayNumber();
    updateStats();
    cameraStatus.textContent = "Hasil scan direset.";
  });

  manualCardCode.addEventListener("input", () => {
    const value = normalizeCardCode(manualCardCode.value);
    activeCardCode = value;
    saveActiveCard(activeCardCode);
    updateScannedCardDisplay(activeCardCode);
    setNextDayNumber();
    autoFillParticipantFromCard();
    updateStats();
  });

  attendanceForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const cardCode = getCurrentCardCode();
    const studentName = normalizeSpaces(studentNameInput.value);
    const studentNim = normalizeSpaces(studentNimInput.value);
    const studentMajor = normalizeSpaces(studentMajorInput.value);
    const dayNumber = Number(dayNumberInput.value);
    const attendanceDate = normalizeDateInput(attendanceDateInput.value);
    const status = normalizeStatus(attendanceStatusInput.value);

    if (!cardCode) {
      alert("Silakan scan ID card dulu atau isi manual ID Card.");
      return;
    }

    if (!studentName) {
      alert("Nama wajib diisi.");
      studentNameInput.focus();
      return;
    }

    if (!studentNim) {
      alert("NIM wajib diisi.");
      studentNimInput.focus();
      return;
    }

    if (!studentMajor) {
      alert("Jurusan wajib diisi.");
      studentMajorInput.focus();
      return;
    }

    if (!dayNumber || dayNumber < 1) {
      alert("Hari ke- harus minimal 1.");
      dayNumberInput.focus();
      return;
    }

    if (!attendanceDate) {
      alert("Tanggal wajib diisi.");
      attendanceDateInput.focus();
      return;
    }

    if (!status) {
      alert("Keterangan wajib dipilih.");
      attendanceStatusInput.focus();
      return;
    }

    const duplicate = attendanceData.find(
      (item) => item.cardCode === cardCode && Number(item.dayNumber) === dayNumber
    );

    if (duplicate) {
      const confirmReplace = confirm(
        `Data ${cardCode} pada hari ke-${dayNumber} sudah ada. Ganti data lama?`
      );
      if (!confirmReplace) return;

      attendanceData = attendanceData.filter(
        (item) => !(item.cardCode === cardCode && Number(item.dayNumber) === dayNumber)
      );
    }

    const record = {
      id: generateId(),
      studentName,
      studentNim,
      studentMajor,
      cardCode,
      dayNumber,
      date: attendanceDate,
      status,
      createdAt: new Date().toISOString()
    };

    attendanceData.push(record);
    attendanceData.sort(sortAttendanceData);
    saveRecords();

    activeCardCode = cardCode;
    saveActiveCard(activeCardCode);

    attendanceStatusInput.value = "Hadir";
    attendanceDateInput.value = getTodayString();

    applyFiltersAndRender();
    setNextDayNumber();
    cameraStatus.textContent = `Data ${cardCode} berhasil disimpan.`;
  });

  applyFilterBtn.addEventListener("click", applyFiltersAndRender);

  [
    filterCardCode,
    filterStatus,
    filterMonth,
    filterExactDate,
    filterDateFrom,
    filterDateTo
  ].forEach((el) => {
    el.addEventListener("change", applyFiltersAndRender);
    el.addEventListener("input", () => {
      if (el === filterCardCode) applyFiltersAndRender();
    });
  });

  resetFilterBtn.addEventListener("click", () => {
    filterCardCode.value = "";
    filterStatus.value = "";
    filterMonth.value = "";
    filterExactDate.value = "";
    filterDateFrom.value = "";
    filterDateTo.value = "";
    applyFiltersAndRender();
  });

  clearAllBtn.addEventListener("click", () => {
    if (!attendanceData.length) {
      alert("Belum ada data absensi.");
      return;
    }

    const confirmed = confirm("Yakin ingin menghapus semua data absensi?");
    if (!confirmed) return;

    attendanceData = [];
    saveRecords();
    applyFiltersAndRender();
    setNextDayNumber();
    cameraStatus.textContent = "Semua data telah dihapus.";
  });

  exportJsonBtn.addEventListener("click", () => {
    const jsonText = JSON.stringify(attendanceData, null, 2);
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `absensi-magang-${getTodayString()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });

  copyJsonBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(attendanceData, null, 2));
      copyJsonBtn.textContent = "Berhasil Dicopy";
      setTimeout(() => {
        copyJsonBtn.textContent = "Copy JSON";
      }, 1200);
    } catch (error) {
      alert("Gagal copy JSON.");
    }
  });

  printPdfBtn.addEventListener("click", () => {
    updatePrintInfo();
    window.print();
  });

  tableBody.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest("[data-delete-id]");
    if (!deleteBtn) return;

    const id = deleteBtn.dataset.deleteId;
    const record = attendanceData.find((item) => item.id === id);
    if (!record) return;

    const confirmed = confirm(
      `Hapus data ${record.cardCode} hari ke-${record.dayNumber}?`
    );
    if (!confirmed) return;

    attendanceData = attendanceData.filter((item) => item.id !== id);
    saveRecords();
    applyFiltersAndRender();
    setNextDayNumber();
  });

  window.addEventListener("beforeunload", () => {
    stopCameraTracks();
  });

  function hydrateActiveCard() {
    updateScannedCardDisplay(activeCardCode || "");
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Browser ini belum mendukung akses kamera.");
      return;
    }

    try {
      stopCameraTracks();

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      cameraVideo.srcObject = stream;
      cameraStatus.textContent = "Kamera aktif. Arahkan ID card ke dalam frame.";
    } catch (error) {
      console.error(error);
      cameraStatus.textContent = "Gagal mengakses kamera.";
      alert("Gagal mengaktifkan kamera. Pastikan izin kamera diizinkan.");
    }
  }

  function stopCamera() {
    stopCameraTracks();
    cameraStatus.textContent = "Kamera dimatikan.";
  }

  function stopCameraTracks() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null;
    }
  }

  async function scanFromCamera() {
    if (typeof Tesseract === "undefined") {
      alert("Library OCR tidak termuat.");
      return;
    }

    if (!cameraVideo.srcObject) {
      alert("Aktifkan kamera terlebih dahulu.");
      return;
    }

    try {
      scanCameraBtn.disabled = true;
      scanCameraBtn.textContent = "Memindai...";
      cameraStatus.textContent = "Mengambil gambar dari kamera...";

      const frame = getCaptureFrame(cameraVideo);
      const ctx = captureCanvas.getContext("2d");

      captureCanvas.width = frame.width;
      captureCanvas.height = frame.height;

      ctx.drawImage(
        cameraVideo,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        0,
        0,
        frame.width,
        frame.height
      );

      cameraStatus.textContent = "Membaca teks ID card...";
      const result = await Tesseract.recognize(captureCanvas, "eng", {
        logger: (msg) => {
          if (msg.status === "recognizing text") {
            const progress = Math.round((msg.progress || 0) * 100);
            cameraStatus.textContent = `Membaca teks... ${progress}%`;
          }
        }
      });

      const rawText = result.data.text || "";
      const cleanedText = normalizeSpaces(rawText);
      const extractedCard = extractEmployeeId(cleanedText);

      if (!extractedCard) {
        cameraStatus.textContent = `Teks terbaca, tapi ID tidak dikenali. Hasil OCR: ${cleanedText || "-"}`;
        alert("ID card belum terbaca jelas. Coba dekatkan kamera atau pencahayaan lebih terang.");
        return;
      }

      activeCardCode = extractedCard;
      saveActiveCard(activeCardCode);
      manualCardCode.value = "";
      updateScannedCardDisplay(activeCardCode);
      setNextDayNumber();
      autoFillParticipantFromCard();
      updateStats();

      cameraStatus.textContent = `Scan berhasil. ID Card terdeteksi: ${extractedCard}`;
    } catch (error) {
      console.error(error);
      cameraStatus.textContent = "Scan kamera gagal.";
      alert("Gagal scan dari kamera.");
    } finally {
      scanCameraBtn.disabled = false;
      scanCameraBtn.textContent = "Scan ID Card";
    }
  }

  function getCaptureFrame(video) {
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    const cropWidth = Math.floor(vw * 0.74);
    const cropHeight = Math.floor(vh * 0.46);

    const sx = Math.floor((vw - cropWidth) / 2);
    const sy = Math.floor((vh - cropHeight) / 2);

    return {
      sx,
      sy,
      sw: cropWidth,
      sh: cropHeight,
      width: cropWidth,
      height: cropHeight
    };
  }

  function getCurrentCardCode() {
    const manualValue = normalizeCardCode(manualCardCode.value);
    if (manualValue) {
      activeCardCode = manualValue;
      saveActiveCard(activeCardCode);
      updateScannedCardDisplay(activeCardCode);
      return manualValue;
    }

    return normalizeCardCode(cardCodeDisplay.value);
  }

  function updateScannedCardDisplay(value) {
    const text = normalizeCardCode(value);
    cardCodeDisplay.value = text;
    scannedIdPreview.textContent = text || "Belum ada hasil scan";
    activeCardBadge.textContent = `ID aktif: ${text || "-"}`;
  }

  function autoFillParticipantFromCard() {
    const card = getCurrentCardCodeSilent();
    if (!card) return;

    const latestRecord = [...attendanceData].reverse().find((item) => item.cardCode === card);
    if (!latestRecord) return;

    if (!studentNameInput.value.trim()) studentNameInput.value = latestRecord.studentName || "";
    if (!studentNimInput.value.trim()) studentNimInput.value = latestRecord.studentNim || "";
    if (!studentMajorInput.value.trim()) studentMajorInput.value = latestRecord.studentMajor || "";
  }

  function getStoredRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.map((item) => ({
            ...item,
            studentName: normalizeSpaces(item.studentName),
            studentNim: normalizeSpaces(item.studentNim),
            studentMajor: normalizeSpaces(item.studentMajor),
            cardCode: normalizeCardCode(item.cardCode),
            date: normalizeDateInput(item.date),
            status: normalizeStatus(item.status)
          }))
        : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function getStoredActiveCard() {
    try {
      return normalizeCardCode(localStorage.getItem(ACTIVE_CARD_KEY) || "");
    } catch (error) {
      console.error(error);
      return "";
    }
  }

  function saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceData));
  }

  function saveActiveCard(value) {
    localStorage.setItem(ACTIVE_CARD_KEY, normalizeCardCode(value));
  }

  function setTodayDate() {
    attendanceDateInput.value = getTodayString();
  }

  function setNextDayNumber() {
    const currentCard = getCurrentCardCodeSilent();
    if (!currentCard) {
      dayNumberInput.value = attendanceData.length ? attendanceData.length + 1 : 1;
      return;
    }

    const sameCardData = attendanceData.filter((item) => item.cardCode === currentCard);
    if (!sameCardData.length) {
      dayNumberInput.value = 1;
      return;
    }

    const maxDay = Math.max(...sameCardData.map((item) => Number(item.dayNumber) || 0));
    dayNumberInput.value = maxDay + 1;
  }

  function getCurrentCardCodeSilent() {
    const manualValue = normalizeCardCode(manualCardCode.value);
    if (manualValue) return manualValue;

    return normalizeCardCode(activeCardCode || cardCodeDisplay.value);
  }

  function applyFiltersAndRender() {
    const searchCard = normalizeCardCode(filterCardCode.value);
    const searchStatus = normalizeStatus(filterStatus.value);
    const searchMonth = normalizeMonthInput(filterMonth.value);
    const exactDate = normalizeDateInput(filterExactDate.value);
    const dateFrom = normalizeDateInput(filterDateFrom.value);
    const dateTo = normalizeDateInput(filterDateTo.value);

    filteredData = attendanceData.filter((item) => {
      const itemCard = normalizeCardCode(item.cardCode);
      const itemStatus = normalizeStatus(item.status);
      const itemDate = normalizeDateInput(item.date);

      const matchCard = !searchCard || itemCard.includes(searchCard);
      const matchStatus = !searchStatus || itemStatus === searchStatus;
      const matchMonth = !searchMonth || itemDate.startsWith(searchMonth);

      let matchExactDate = true;
      if (exactDate) {
        matchExactDate = itemDate === exactDate;
      }

      let matchRange = true;
      if (dateFrom && itemDate < dateFrom) matchRange = false;
      if (dateTo && itemDate > dateTo) matchRange = false;

      return matchCard && matchStatus && matchMonth && matchExactDate && matchRange;
    });

    filteredData.sort(sortAttendanceData);

    renderTable();
    renderJsonPreview();
    updateStats();
    updateFilterInfo();
    updatePrintInfo();
  }

  function renderTable() {
    if (!filteredData.length) {
      tableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="7">Belum ada data absensi yang sesuai filter.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filteredData
      .map((item, index) => {
        const statusClass = getStatusClass(item.status);
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.cardCode)}</td>
            <td>${escapeHtml(String(item.dayNumber))}</td>
            <td>${formatDateIndonesia(item.date)}</td>
            <td><span class="status-pill ${statusClass}">${escapeHtml(item.status)}</span></td>
            <td>${formatDateTime(item.createdAt)}</td>
            <td class="table-action-col print-hide">
              <button class="btn-delete-row magnetic" data-delete-id="${item.id}">
                Hapus
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    initMagneticButtons();
  }

  function renderJsonPreview() {
    jsonOutput.textContent = JSON.stringify(attendanceData, null, 2);
  }

  function updateStats() {
    dataCount.textContent = `Total data: ${attendanceData.length}`;
    filteredCount.textContent = `Data tampil: ${filteredData.length}`;
    activeCardBadge.textContent = `ID aktif: ${getCurrentCardCodeSilent() || "-"}`;
  }

  function updateFilterInfo() {
    const parts = [];

    if (filterCardCode.value.trim()) parts.push(`ID: ${filterCardCode.value.trim()}`);
    if (filterStatus.value) parts.push(`Keterangan: ${filterStatus.value}`);
    if (filterMonth.value) parts.push(`Bulan: ${formatMonthInput(filterMonth.value)}`);
    if (filterExactDate.value) parts.push(`Tanggal: ${formatDateIndonesia(filterExactDate.value)}`);
    if (filterDateFrom.value || filterDateTo.value) {
      parts.push(
        `Periode: ${filterDateFrom.value ? formatDateIndonesia(filterDateFrom.value) : "-"} s/d ${filterDateTo.value ? formatDateIndonesia(filterDateTo.value) : "-"}`
      );
    }

    printFilterInfo.textContent = `Filter aktif: ${parts.length ? parts.join(" | ") : "Semua data"}`;
  }

  function updatePrintInfo() {
    const participant = getPrintParticipant();

    printStudentName.textContent = participant.studentName || "-";
    printStudentNim.textContent = participant.studentNim || "-";
    printStudentMajor.textContent = participant.studentMajor || "-";
    printCardCode.textContent = participant.cardCode || "-";
    printTimestamp.textContent = formatDateTime(new Date().toISOString());
  }

  function getPrintParticipant() {
    const currentCard = getCurrentCardCodeSilent();

    if (currentCard) {
      const byCard = [...attendanceData].reverse().find((item) => item.cardCode === currentCard);
      if (byCard) return byCard;
    }

    if (filteredData.length > 0) {
      return filteredData[0];
    }

    return {
      studentName: normalizeSpaces(studentNameInput.value),
      studentNim: normalizeSpaces(studentNimInput.value),
      studentMajor: normalizeSpaces(studentMajorInput.value),
      cardCode: currentCard || "-"
    };
  }

  function sortAttendanceData(a, b) {
    const cardA = normalizeCardCode(a.cardCode);
    const cardB = normalizeCardCode(b.cardCode);

    if (cardA !== cardB) {
      return cardA.localeCompare(cardB);
    }

    const dateA = normalizeDateInput(a.date);
    const dateB = normalizeDateInput(b.date);

    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    return Number(a.dayNumber) - Number(b.dayNumber);
  }

  function generateId() {
    return "ATT-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateIndonesia(dateString) {
    if (!dateString) return "-";
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function formatDateTime(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function formatMonthInput(value) {
    if (!value) return "-";
    const [year, month] = value.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }

  function getStatusClass(status) {
    const value = normalizeStatus(status).toLowerCase();

    switch (value) {
      case "hadir":
        return "status-hadir";
      case "sakit":
        return "status-sakit";
      case "alpha":
        return "status-alpha";
      case "izin":
        return "status-izin";
      default:
        return "";
    }
  }

  function normalizeSpaces(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .replace(/[\r\n]+/g, " ")
      .trim();
  }

  function normalizeCardCode(text) {
    return normalizeSpaces(String(text || "").toUpperCase());
  }

  function normalizeStatus(text) {
    const clean = normalizeSpaces(text);
    if (!clean) return "";
    const lower = clean.toLowerCase();

    if (lower === "hadir") return "Hadir";
    if (lower === "sakit") return "Sakit";
    if (lower === "alpha") return "Alpha";
    if (lower === "izin") return "Izin";

    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }

  function normalizeDateInput(value) {
    const clean = String(value || "").trim();
    if (!clean) return "";

    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return clean;

    const date = new Date(clean);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function normalizeMonthInput(value) {
    const clean = String(value || "").trim();
    const match = clean.match(/^(\d{4})-(\d{2})$/);
    return match ? clean : "";
  }

  function extractEmployeeId(text) {
    const normalized = normalizeSpaces(text).toUpperCase();

    const pklMatch = normalized.match(/PKL\s*[-:]?\s*(\d{1,4})/);
    if (pklMatch) {
      return `PKL ${pklMatch[1]}`;
    }

    const genericMatch = normalized.match(/[A-Z]{2,6}\s*\d{1,4}/);
    if (genericMatch) {
      return genericMatch[0].replace(/\s+/g, " ").trim();
    }

    return "";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}