import React, { useState } from "react";

// Función auxiliar para extraer el ID del video de una URL de YouTube.
const extractVideoId = (url) => {
  console.log("Extrayendo video ID de URL:", url);
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = match && match[7].length === 11 ? match[7] : null;
  console.log("Video ID extraído:", videoId);
  return videoId;
};

function YoutubeTranscriptionPage() {
  const [videoUrl, setVideoUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Función para obtener el XML de la transcripción en un idioma dado.
  const fetchTranscriptWithLang = async (videoId, lang) => {
    const transcriptUrl = `https://video.google.com/timedtext?lang=${lang}&v=${videoId}`;
    console.log(`Obteniendo subtítulos para video ID ${videoId} con lang=${lang}`);
    console.log("URL de subtítulos:", transcriptUrl);
    const response = await fetch(transcriptUrl);
    console.log("Estado de la respuesta:", response.status);
    const xmlText = await response.text();
    console.log(`Longitud del XML obtenido con lang=${lang}:`, xmlText.length);
    return xmlText;
  };

  const fetchTranscript = async () => {
    console.log("Iniciando fetchTranscript");
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      console.error("URL de YouTube no válida proporcionada");
      setError("Por favor, introduce una URL válida de YouTube.");
      return;
    }
    setError("");
    setLoading(true);
    setTranscript("");
    
    try {
      // Array de lenguajes a intentar.
      const languages = ["en", "es", "auto"];
      let xmlText = "";
      let found = false;
      
      for (let lang of languages) {
        xmlText = await fetchTranscriptWithLang(videoId, lang);
        if (xmlText.trim() !== "") {
          console.log(`Subtítulos encontrados con lang=${lang}`);
          found = true;
          break;
        } else {
          console.log(`Subtítulos vacíos con lang=${lang}, intentando siguiente opción.`);
        }
      }
      
      if (!found) {
        throw new Error("No hay transcripción disponible en ninguno de los idiomas probados.");
      }
      
      console.log("XML obtenido:", xmlText);
      
      // Parsear el XML.
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      console.log("Documento XML parseado:", xmlDoc);
      
      // Comprobar errores de parseo.
      const errorNode = xmlDoc.getElementsByTagName("parsererror");
      if (errorNode.length > 0) {
        console.error("Error al parsear el XML:", errorNode[0].textContent);
        throw new Error("Error al parsear el XML de transcripción.");
      }
      
      const textNodes = xmlDoc.getElementsByTagName("text");
      console.log("Nodos de texto encontrados:", textNodes.length);
      
      let transcriptText = "";
      for (let i = 0; i < textNodes.length; i++) {
        console.log(`Procesando nodo ${i}:`, textNodes[i].textContent);
        transcriptText += textNodes[i].textContent + " ";
      }
      transcriptText = transcriptText.trim();
      console.log("Transcripción final:", transcriptText);
      setTranscript(transcriptText);
    } catch (err) {
      console.error("Error obteniendo la transcripción:", err);
      setError(err.message);
    }
    setLoading(false);
    console.log("fetchTranscript completado");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Obtenedor de Transcripciones de YouTube</h1>
      <div className="w-full max-w-md">
        <label htmlFor="videoUrl" className="block mb-2 text-lg">
          Introduce la URL del video de YouTube:
        </label>
        <input
          id="videoUrl"
          type="text"
          value={videoUrl}
          onChange={(e) => {
            console.log("Video URL cambiada:", e.target.value);
            setVideoUrl(e.target.value);
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700"
        />
        {error && (
          <p className="mt-2 text-red-500">
            {error} (Consulta la consola para más detalles)
          </p>
        )}
        <button
          onClick={() => {
            console.log("Botón de Obtener Transcripción pulsado");
            fetchTranscript();
          }}
          disabled={loading}
          className="mt-4 w-full bg-[#ebb305] py-3 rounded-lg text-black font-semibold hover:bg-[#d4a91d] transition-colors"
        >
          {loading ? "Obteniendo Transcripción..." : "Obtener Transcripción"}
        </button>
        {transcript && (
          <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Transcripción</h2>
            <p>{transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default YoutubeTranscriptionPage;
