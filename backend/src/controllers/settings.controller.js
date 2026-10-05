import {
  getInstituteSettings,
  updateInstituteSettings,
} from "../services/settings.service";

export const getInstituteSettingsController = async (req, res) => {
  try {
    const settings = await getInstituteSettings();
    res.status(200).json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};

export const updateInstituteSettingsController = async (req, res) => {
  try {
    const settings = await updateInstituteSettings(req.body);
    res.status(200).json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong on the server" });
  }
};