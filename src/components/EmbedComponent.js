import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";


const EmbedComponent = ({ embedCode, url }) => {
  const [fallbackData, setFallbackData] = useState(null);
  const [shouldUseFallback, setShouldUseFallback] = useState(false);

  useEffect(() => {
    // Immediately try to fetch OG data as a backup
    if (url) {
      fetch(`/api/og?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
          console.log('OG data fetched:', data);
          setFallbackData(data);
        })
        .catch(error => {
          console.error('Error fetching OG data:', error);
        });
    }
  }, [url]);

  // Function to sanitise iframe or embed code
  const sanitizedEmbedCode = embedCode ? DOMPurify.sanitize(embedCode) : null;

  const handleIframeError = () => {
    console.log('Iframe failed to load, switching to fallback');
    setShouldUseFallback(true);
  };

  const FallbackCard = ({ metadata }) => (
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 border rounded-lg hover:shadow-lg transition-shadow"
    >
      {metadata.image && (
        <img 
          src={metadata.image} 
          alt={metadata.title}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
      )}
      <h3 className="font-bold text-lg mb-2">{metadata.title}</h3>
      {metadata.description && (
        <p className="text-gray-600 text-sm mb-2">{metadata.description}</p>
      )}
      <p className="text-gray-500 text-xs">{metadata.site_name}</p>
    </a>
  );

  const renderEmbed = () => {
    if (sanitizedEmbedCode) {
      return <div dangerouslySetInnerHTML={{ __html: sanitizedEmbedCode }} />;
    }

    if (url) {
      const isGoogleDoc = url.includes("docs.google.com/document");
      const isGoogleSheet = url.includes("docs.google.com/spreadsheets");
      const isGoogleSlide = url.includes("docs.google.com/presentation");
      const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
      const isNotion = url.includes("notion.so") || url.includes("notion.site");
      const isAirtable = url.includes("airtable.com");

      if (isNotion) {
        return (
          <div className="p-4 border rounded-lg border-pink-400 bg-pink-50 text-center">
            <p className="mb-3 text-gray-700">
              Unfortunately we currently cannot directly embed Notion content due to their Content Security Policy.
            </p>
            <p className="text-gray-700">
              If you wish to embed directly you can use a tool like{' '}
              <a 
                href="https://notionhero.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                NotionHero
              </a>
              {' '}to create an embed link for free.
            </p>
          </div>
        );
      }

      if (isAirtable) {
        // Handle both share URLs and embed URLs
        const embedUrl = url.includes('/embed/') 
          ? url 
          : url.replace('airtable.com/', 'airtable.com/embed/');
        
        return (
          <iframe
            src={embedUrl}
            width="100%"
            height="600"
            frameBorder="0"
            onmousewheel=""
            style={{
              background: 'transparent',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        );
      }
      

      if (isGoogleDoc) {
        return (
          <iframe
            src={`${url.replace(/\/edit.*/, "/preview")}`}
            width="100%"
            height="600"
            frameBorder="0"
            allowFullScreen
          />
        );
      }

      if (isGoogleSheet) {
        // Extract the spreadsheet ID from the URL
        const sheetId = url.match(/[-\w]{25,}/);
        if (sheetId) {
          return (
            <iframe
              src={`https://docs.google.com/spreadsheets/d/${sheetId[0]}/preview`}
              width="100%"
              height="600"
              frameBorder="0"
            />
          );
        }
      }

      if (isGoogleSlide) {
        return (
          <iframe
            src={`${url.replace(/\/edit.*/, "/embed?start=false&loop=false&delayms=3000")}`}
            width="100%"
            height="600"
            frameBorder="0"
          />
        );
      }

      if (isYouTube) {
        const videoId = url.split("v=")[1]?.split("&")[0] || url.split("/").pop();
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            width="100%"
            height="400"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        );
      }

      // If we should use fallback and we have fallback data, show the card
      if (shouldUseFallback && fallbackData) {
        return <FallbackCard metadata={fallbackData} />;
      }

      // Try the iframe with error handling
      return (
        <ErrorBoundary fallback={fallbackData && <FallbackCard metadata={fallbackData} />}>
          <iframe
            src={url}
            width="100%"
            height="600"
            frameBorder="0"
            onError={handleIframeError}
            onLoad={(e) => {
              try {
                // This will throw if we can't access the iframe
                const _ = e.target.contentWindow.location.href;
              } catch (error) {
                handleIframeError();
              }
            }}
          />
        </ErrorBoundary>
      );
    }

    return <p>Please provide a valid URL or embed code.</p>;
  };

  return <div>{renderEmbed()}</div>;
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log('Iframe error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Error loading content.</div>;
    }

    return this.props.children;
  }
}

export default EmbedComponent;
