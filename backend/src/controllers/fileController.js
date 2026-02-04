const uploadFile = (req, res) => {
  try {
    res.status(200).json({ message: "File uploaded successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export { uploadFile };
