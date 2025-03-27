import React, { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';

const defaultTemplate = `# %Project Title% by %Author% 😎

[![Build Status](%Build_Badge_URL%)](%Build_Link%) [![License](%License_Badge_URL%)](%License_Link%)

🚀 **No servers. No ads. No tracking.**  
⚡ **100% Free & Open Source. Everything runs directly in your browser.**

🌐 **Live Demo:** [%Demo_Link%](%Demo_Link%)  
💻 **GitHub:** [%GitHub_Link%](%GitHub_Link%)

---

## 🛠️ About This Project

**%Project Title%** is a suite of fast, privacy‑friendly, and entirely **frontend‑based** utilities designed for a wide range of users.

**Key Benefits:**  
✅ **No tracking** – Your data stays on your device  
✅ **Completely free** – Open‑source with no subscriptions or ads  
✅ **Instant results** – No delays or server uploads required

---

## ✨ Features

### Feature Group 1: %Feature Group 1 Title%
%Feature Group 1 Description%

- **%Feature 1 Name%:** %Feature 1 Description%
- **%Feature 2 Name%:** %Feature 2 Description%
- **%Feature 3 Name%:** %Feature 3 Description%

### Feature Group 2: %Feature Group 2 Title%
%Feature Group 2 Description%

- **%Feature 4 Name%:** %Feature 4 Description%
- **%Feature 5 Name%:** %Feature 5 Description%
- **%Feature 6 Name%:** %Feature 6 Description%

---

## 🚀 How It Works

**All features run entirely in your browser** using modern web technologies (JavaScript, Web APIs, etc.).  
Your data never leaves your device.

🔹 **Instant results** – No waiting, no lag  
🔹 **Works offline** – Many features function even without an internet connection

---

## 📥 Installation (For Local Development)

### First-Time Setup
\`\`\`sh
npm install
\`\`\`

### Launch the Project
\`\`\`sh
npm run dev
\`\`\`

### Deploy on %Hosting_Service%
\`\`\`sh
%deploy_command%
\`\`\`
*Note: Ensure you have the %Hosting_Service% CLI installed and are logged in.*

---

## 💡 Contributing

Contributions are welcome! If you find a bug or have a feature request, please submit an **issue** or **pull request** on GitHub.

---

## 📜 License

This project is licensed under the **MIT License** – free to use, modify, and distribute.

---

🔗 **Created by [%Author_Name%](%Author_Website%)**  
💻 **GitHub:** [%GitHub_Link%](%GitHub_Link%)  
🌐 **Live Demo:** [%Demo_Link%](%Demo_Link%)
`;

const ReadmeGeneratorPage = () => {
  const [markdown, setMarkdown] = useState(defaultTemplate);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6">Readme Generator</h1>
      <MDEditor
        value={markdown}
        onChange={(val) => setMarkdown(val || "")}
      />
    </div>
  );
};

export default ReadmeGeneratorPage;
