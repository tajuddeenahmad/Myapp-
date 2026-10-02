import React, { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import {
  openTajVidCamera,
  closeTajVidCamera,
  default as TajVidCamera,
} from "../lib/tajvidCamera";

const CLOUDINARY_CLOUD_NAME = "kpbkojvd";
const CLOUDINARY_UPLOAD_PRESET = "Tajvid upload";

export default function Post() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [caption, setCaption] = useState("");
  const [video, setVideo] = useState(null);
  const [preview, setPreview] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const galleryInputRef = useRef(null);

  // =========================================================
  // AUTH
  // =========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // NATIVE TAJVID CAMERA
  // =========================================================

  useEffect(() => {
    let mediaListener;
    let closeListener;
    let mounted = true;

    async function setupCamera() {
      try {
        mediaListener =
          await TajVidCamera.addListener(
            "mediaCaptured",
            async (data) => {
              if (!mounted) return;

              try {
                if (!data?.path && !data?.uri) {
                  console.error(
                    "TajVid camera returned no media path."
                  );
                  return;
                }

                /*
                 * The native plugin copies the selected/captured
                 * media into the app cache and sends `path`.
                 *
                 * Capacitor/WebView cannot reliably fetch a
                 * native content:// URI directly, so we prefer
                 * the native cache path.
                 */

                let file;

                if (data.path) {
                  const mediaUrl = Capacitor.convertFileSrc(
                    data.path
                  );

                  const response = await fetch(
                    mediaUrl
                  );

                  if (!response.ok) {
                    throw new Error(
                      "Could not read captured media."
                    );
                  }

                  const blob =
                    await response.blob();

                  const isImage =
                    data.type === "image";

                  file = new File(
                    [blob],
                    `TajVid_${Date.now()}${
                      isImage ? ".jpg" : ".mp4"
                    }`,
                    {
                      type: isImage
                        ? "image/jpeg"
                        : "video/mp4",
                    }
                  );
                } else {
                  /*
                   * Fallback for older native plugin output.
                   */
                  const response =
                    await fetch(data.uri);

                  const blob =
                    await response.blob();

                  const isImage =
                    data.type === "image";

                  file = new File(
                    [blob],
                    `TajVid_${Date.now()}${
                      isImage ? ".jpg" : ".mp4"
                    }`,
                    {
                      type: isImage
                        ? "image/jpeg"
                        : "video/mp4",
                    }
                  );
                }

                if (!mounted) return;

                setVideo(file);

                setPreview(
                  URL.createObjectURL(file)
                );

                setUploadProgress(0);

              } catch (error) {

                console.error(
                  "Camera media error:",
                  error
                );

                alert(
                  "Could not load the selected media."
                );
              }
            }
          );

        closeListener =
          await TajVidCamera.addListener(
            "cameraClosed",
            () => {
              console.log(
                "TajVid camera closed"
              );
            }
          );

        if (!mounted) return;

        await openTajVidCamera();

      } catch (error) {

        console.error(
          "Could not open TajVid camera:",
          error
        );
      }
    }

    if (!video) {
      setupCamera();
    }

    return () => {

      mounted = false;

      mediaListener?.remove();
      closeListener?.remove();

      closeTajVidCamera().catch(
        () => {}
      );
    };

  }, [video]);

  // =========================================================
  // PREVIEW CLEANUP
  // =========================================================

  useEffect(() => {

    return () => {

      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };

  }, [preview]);

  // =========================================================
  // DEVICE FILE PICKER FALLBACK
  // =========================================================

  function handleVideoChange(e) {

    const file =
      e.target.files?.[0];

    if (!file) return;

    const isVideo =
      file.type.startsWith("video/");

    const isImage =
      file.type.startsWith("image/");

    if (!isVideo && !isImage) {

      alert(
        "Please select a valid photo or video."
      );

      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setVideo(file);

    setPreview(
      URL.createObjectURL(file)
    );

    setUploadProgress(0);

    // Allow selecting the same file again.
    e.target.value = "";
  }

  // =========================================================
  // WEB GALLERY FALLBACK
  // =========================================================

  function openGallery() {
    galleryInputRef.current?.click();
  }

  // =========================================================
  // CLOUDINARY
  // =========================================================

  async function uploadMediaToCloudinary(
    file
  ) {

    return new Promise(
      (resolve, reject) => {

        const xhr =
          new XMLHttpRequest();

        const resourceType =
          file.type.startsWith("image/")
            ? "image"
            : "video";

        const url =
          `https://api.cloudinary.com/v1_1/` +
          `${CLOUDINARY_CLOUD_NAME}/` +
          `${resourceType}/upload`;

        xhr.open(
          "POST",
          url
        );

        xhr.upload.onprogress =
          (event) => {

            if (event.lengthComputable) {

              const progress =
                Math.round(
                  (event.loaded /
                    event.total) *
                    100
                );

              setUploadProgress(
                progress
              );
            }
          };

        xhr.onload = () => {

          try {

            const data =
              JSON.parse(
                xhr.responseText
              );

            if (
              xhr.status >= 200 &&
              xhr.status < 300
            ) {

              resolve(data);

            } else {

              reject(
                new Error(
                  data?.error?.message ||
                  "Cloudinary upload failed."
                )
              );
            }

          } catch {

            reject(
              new Error(
                "Invalid response from Cloudinary."
              )
            );
          }
        };

        xhr.onerror = () => {

          reject(
            new Error(
              "Network error while uploading media."
            )
          );
        };

        xhr.onabort = () => {

          reject(
            new Error(
              "Media upload was cancelled."
            )
          );
        };

        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        formData.append(
          "upload_preset",
          CLOUDINARY_UPLOAD_PRESET
        );

        xhr.send(formData);
      }
    );
  }

  // =========================================================
  // POST
  // =========================================================

  async function handlePost(e) {

    e.preventDefault();

    if (!currentUser) {

      alert(
        "Please login first to create a post."
      );

      navigate("/login");

      return;
    }

    if (!video) {

      alert(
        "Please select a photo or video first."
      );

      return;
    }

    try {

      setLoading(true);
      setUploadProgress(0);

      const cloudinaryResult =
        await uploadMediaToCloudinary(
          video
        );

      const mediaUrl =
        cloudinaryResult?.secure_url ||
        cloudinaryResult?.url;

      if (!mediaUrl) {

        throw new Error(
          "Cloudinary did not return a media URL."
        );
      }

      const mediaType =
        video.type.startsWith("image/")
          ? "image"
          : "video";

      const postData = {

        uid: currentUser.uid,

        caption:
          caption.trim(),

        visibility,

        mediaType,

        mediaUrl,

        ...(mediaType === "image"
          ? {
              imageUrl: mediaUrl,
            }
          : {
              videoUrl: mediaUrl,
            }),

        likes: 0,

        views: 0,

        createdAt:
          serverTimestamp(),
      };

      await addDoc(
        collection(db, "posts"),
        postData
      );

      alert(
        "Media posted successfully!"
      );

      setCaption("");
      setVideo(null);
      setUploadProgress(100);

      if (preview) {
        URL.revokeObjectURL(
          preview
        );
      }

      setPreview("");

      navigate("/");

    } catch (error) {

      console.error(
        "Post creation error:",
        error
      );

      alert(
        error?.message ||
        "Failed to upload media. Please try again."
      );

    } finally {

      setLoading(false);
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="post-page">

      <header className="post-topbar">

        <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ←
        </button>

        <div className="topbar-title">
          Create Post
        </div>

        <div className="topbar-space" />

      </header>

      <div className="post-scroll">

        <div className="post-container">

          <div className="post-header">

            <h1>Create Post</h1>

            <p>
              Share your photo or video with TajVid
            </p>

          </div>

          <form onSubmit={handlePost}>

            <div className="upload-box">

              {preview ? (

                <div className="video-preview">

                  {video?.type?.startsWith(
                    "image/"
                  ) ? (

                    <img
                      src={preview}
                      alt="Selected media preview"
                    />

                  ) : (

                    <video
                      src={preview}
                      controls
                      playsInline
                    />
                  )}

                </div>

              ) : (

                <div className="upload-placeholder">

                  <div className="upload-icon">
                    ＋
                  </div>

                  <h2>
                    Capture or Upload
                  </h2>

                  <p>
                    Use the TajVid camera or choose media from your gallery.
                  </p>

                </div>
              )}

              <label className="select-video">

                {video
                  ? "Change Media"
                  : "Select Media"}

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={
                    handleVideoChange
                  }
                  hidden
                />

              </label>

              {!video && (
                <button
                  type="button"
                  className="open-camera-button"
                  onClick={() => {
                    openTajVidCamera();
                  }}
                >
                  Open TajVid Camera
                </button>
              )}

            </div>

            {loading && (

              <div className="upload-status">

                <div className="upload-status-text">

                  Uploading media...
                  {" "}
                  {uploadProgress}%

                </div>

                <div className="progress-background">

                  <div
                    className="progress-bar"
                    style={{
                      width:
                        `${uploadProgress}%`,
                    }}
                  />

                </div>

              </div>
            )}

            <div className="form-section">

              <label>
                Caption
              </label>

              <textarea
                value={caption}
                onChange={(e) =>
                  setCaption(
                    e.target.value
                  )
                }
                placeholder="Write something about your post..."
                maxLength={500}
              />

              <div className="character-count">
                {caption.length}/500
              </div>

            </div>

            <div className="form-section">

              <label>
                Visibility
              </label>

              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(
                    e.target.value
                  )
                }
              >

                <option value="public">
                  Public
                </option>

                <option value="followers">
                  Followers
                </option>

                <option value="private">
                  Only me
                </option>

              </select>

            </div>

            <div className="post-info">

              <h3>
                Post Tips
              </h3>

              <ul>

                <li>
                  Use clear, high-quality media.
                </li>

                <li>
                  Add an interesting caption.
                </li>

                <li>
                  Keep your content engaging.
                </li>

                <li>
                  Respect TajVid community guidelines.
                </li>

              </ul>

            </div>

            <button
              type="submit"
              className="post-button"
              disabled={
                loading || !video
              }
            >

              {loading
                ? `Uploading ${uploadProgress}%...`
                : "Post Media"}

            </button>

          </form>

        </div>

      </div>

      <style>{`

        * {
          box-sizing: border-box;
        }

        .post-page {
          width: 100%;
          height: 100vh;
          min-height: 100vh;
          overflow: hidden;
          background: #f5f5f5;
        }

        .post-topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          height: 64px;
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
          background: #111;
          color: white;
          border-bottom: 1px solid #292929;
        }

        .back-button {
          width: 42px;
          height: 42px;
          border: 1px solid #333;
          border-radius: 50%;
          background: #1d1d1d;
          color: white;
          font-size: 25px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .topbar-title {
          font-size: 19px;
          font-weight: 700;
        }

        .topbar-space {
          width: 42px;
          height: 42px;
        }

        .post-scroll {
          width: 100%;
          height: calc(100vh - 64px);
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          padding-bottom: 40px;
        }

        .post-container {
          width: 100%;
          max-width: 650px;
          margin: 0 auto;
          padding: 20px 16px 60px;
        }

        .post-header {
          margin-bottom: 20px;
        }

        .post-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #111;
        }

        .post-header p {
          margin-top: 7px;
          color: #777;
          font-size: 15px;
        }

        form {
          width: 100%;
        }

        .upload-box {
          background: white;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          margin-bottom: 20px;
        }

        .upload-placeholder {
          min-height: 230px;
          border: 2px dashed #ccc;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 25px;
        }

        .upload-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: #555;
          margin-bottom: 12px;
        }

        .upload-placeholder h2 {
          margin: 0;
          font-size: 20px;
          color: #222;
        }

        .upload-placeholder p {
          margin: 8px 0 0;
          color: #888;
          text-align: center;
        }

        .video-preview {
          width: 100%;
          height: min(65vh, 560px);
          background: #000;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-preview video,
        .video-preview img {
          display: block;
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          background: #000;
        }

        .select-video,
        .open-camera-button {
          display: block;
          width: 100%;
          margin-top: 14px;
          padding: 14px;
          border-radius: 12px;
          background: #111;
          color: white;
          text-align: center;
          font-weight: 600;
          cursor: pointer;
          border: none;
          font-size: 15px;
        }

        .open-camera-button {
          background: #333;
        }

        .upload-status {
          background: white;
          padding: 15px;
          border-radius: 14px;
          margin-bottom: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .upload-status-text {
          font-size: 14px;
          font-weight: 600;
          color: #222;
          margin-bottom: 10px;
        }

        .progress-background {
          width: 100%;
          height: 9px;
          background: #e5e5e5;
          border-radius: 20px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: #111;
          border-radius: 20px;
          transition: width 0.2s ease;
        }

        .form-section {
          position: relative;
          background: white;
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .form-section label {
          display: block;
          font-weight: 600;
          color: #222;
          margin-bottom: 9px;
        }

        textarea {
          width: 100%;
          min-height: 130px;
          resize: vertical;
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 13px;
          font-size: 15px;
          outline: none;
          font-family: inherit;
        }

        textarea:focus,
        select:focus {
          border-color: #555;
        }

        .character-count {
          text-align: right;
          color: #888;
          font-size: 12px;
          margin-top: 6px;
        }

        select {
          width: 100%;
          padding: 13px;
          border: 1px solid #ddd;
          border-radius: 12px;
          background: white;
          font-size: 15px;
          outline: none;
        }

        .post-info {
          background: white;
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .post-info h3 {
          margin: 0 0 10px;
          font-size: 17px;
        }

        .post-info ul {
          margin: 0;
          padding-left: 20px;
          color: #666;
        }

        .post-info li {
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .post-button {
          width: 100%;
          border: none;
          border-radius: 14px;
          padding: 16px;
          background: #111;
          color: white;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 20px;
        }

        .post-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {

          .post-container {
            padding:
              16px
              12px
              70px;
          }

          .post-header h1 {
            font-size: 25px;
          }

          .upload-placeholder {
            min-height: 210px;
          }
        }

      `}</style>

    </div>
  );
}
