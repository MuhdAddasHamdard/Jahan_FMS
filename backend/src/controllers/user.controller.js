import {
  getAllUsers,
  createUserService,
  loginUserService,
} from "../services/user.service";
export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await createUserService({
      name,
      email,
      password,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await loginUserService(email, password);

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    return res.status(200).json({
      message: "Login successful",
      user,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong on the server",
    });
  }
};
