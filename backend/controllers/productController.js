import Product from "../models/Product.js";

export const getProducts = async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const filter = search ? { name: { $regex: search, $options: "i" } } : {};
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const { name, slug, price, stock, description, image } = req.body;

    if (!name || !slug || price === undefined) {
      const error = new Error("name, slug, and price are required");
      error.statusCode = 400;
      throw error;
    }

    const exists = await Product.findOne({ slug });
    if (exists) {
      const error = new Error("Product slug already exists");
      error.statusCode = 409;
      throw error;
    }

    const created = await Product.create({
      name,
      slug,
      price,
      stock: stock ?? 0,
      description: description ?? "",
      image: image ?? ""
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};
