const chat = document.getElementById('chat');
    const textInput = document.getElementById('textInput');
    const recordBtn = document.getElementById('recordBtn');
    let recording = false;
    let mediaRecorder;
    let messages = [];

    async function sendTextMessage() {
      const content = textInput.value.trim();
      if (!content) return;
      messages.push({ role: 'user', content });
      updateChat();
      textInput.value = '';

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR-API-KEY'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: messages
        })
      });
      const data = await res.json();
      const reply = data.choices[0].message;
      messages.push(reply);
      updateChat();
    }

    function updateChat() {
      chat.innerHTML = messages.map(m => `<div class="message"><strong>${m.role}:</strong> ${m.content}</div>`).join('');
      chat.scrollTop = chat.scrollHeight;
    }

    document.getElementById('fileInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.onload = function (e) {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const table = json.map(row => row.join(' | ')).join('\n');
          messages.push({ role: "user", content: `Content from ${file.name}:\n` + table });
          updateChat();
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
        reader.onload = () => {
          const content = reader.result;
          messages.push({ role: "user", content: `File content from ${file.name}:\n` + content });
          updateChat();
        };
        reader.readAsText(file);
      } else {
        messages.push({ role: "user", content: `File uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` });
        updateChat();
      }
    });

    recordBtn.addEventListener('click', async () => {
      if (recording) {
        mediaRecorder.stop();
        recordBtn.textContent = 'Start Voice Input';
        recording = false;
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', blob, 'audio.webm');
          formData.append('model', 'whisper-1');

          const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer YOUR_OPENAI_API_KEY'
            },
            body: formData
          });
          const data = await res.json();
          textInput.value = data.text;
        };
        mediaRecorder.start();
        recordBtn.textContent = 'Stop Recording';
        recording = true;
      }
    });