import db from "../configs/db.js";
import { mockBlogsSeed } from "../configs/mockBlogs.js";

let localBlogs = [...mockBlogsSeed.map((b, idx) => ({ id: idx + 1, ...b, status: "ACTIVE" }))];

export const getBlogs = async (req, res) => {
  try {
    const [blogs] = await db.query(
      "SELECT * FROM waqt_money_blogs ORDER BY id DESC"
    );
    const cleanedBlogs = blogs.map((b) => ({
      ...b,
      image: b.image ? b.image : "/blog-assets/blog-1-personal-loan-guide.webp"
    }));
    return res.status(200).json({
      success: true,
      blogs: cleanedBlogs.length > 0 ? cleanedBlogs : localBlogs,
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      blogs: localBlogs,
    });
  }
};

export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM waqt_money_blogs WHERE slug = ? OR id = ?",
      [slug, isNaN(Number(slug)) ? -1 : Number(slug)]
    );

    if (rows.length === 0) {
      const found = localBlogs.find((b) => b.slug === slug || String(b.id) === String(slug));
      if (found) {
        return res.status(200).json({ success: true, blog: found });
      }
      return res.status(404).json({
        success: false,
        message: "Blog article not found",
      });
    }

    const blog = {
      ...rows[0],
      image: rows[0].image ? rows[0].image : "/blog-assets/blog-1-personal-loan-guide.webp"
    };

    return res.status(200).json({
      success: true,
      blog,
    });
  } catch (error) {
    const found = localBlogs.find((b) => b.slug === req.params.slug || String(b.id) === String(req.params.slug));
    if (found) {
      return res.status(200).json({ success: true, blog: found });
    }
    return res.status(500).json({
      success: false,
      message: "Error retrieving blog details",
      error: error.message,
    });
  }
};

export const createBlog = async (req, res) => {
  try {
    const { title, slug, category, author, excerpt, content, readTime, status } = req.body;
    
    if (!title || !slug || !excerpt || !content) {
      return res.status(400).json({
        success: false,
        message: "Title, slug, excerpt, and content are required",
      });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    const image = req.file ? `/uploads/${req.file.filename}` : "/blog-assets/blog-1-personal-loan-guide.webp";
    const blogStatus = status || "ACTIVE";
    const read = readTime || `${Math.max(1, Math.ceil(content.split(/\s+/).length / 200))} Min Read`;

    try {
      const [result] = await db.query(
        "INSERT INTO waqt_money_blogs (slug, title, excerpt, content, image, author, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          cleanSlug,
          title,
          excerpt,
          content,
          image,
          author || "Waqt Money Team",
          category || "Personal Loan",
        ]
      );

      const newBlog = {
        id: result.insertId,
        slug: cleanSlug,
        title,
        excerpt,
        content,
        image,
        author: author || "Waqt Money Team",
        category: category || "Personal Loan",
        readTime: read,
        status: blogStatus,
        created_at: new Date().toISOString()
      };
      localBlogs.unshift(newBlog);

      return res.status(201).json({
        success: true,
        message: "Blog created successfully",
        blog: newBlog,
        blogId: result.insertId,
      });
    } catch (dbErr) {
      const newBlog = {
        id: Date.now(),
        slug: cleanSlug,
        title,
        excerpt,
        content,
        image,
        author: author || "Waqt Money Team",
        category: category || "Personal Loan",
        readTime: read,
        status: blogStatus,
        created_at: new Date().toISOString()
      };
      localBlogs.unshift(newBlog);

      return res.status(201).json({
        success: true,
        message: "Blog created successfully",
        blog: newBlog,
        blogId: newBlog.id,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating blog post",
      error: error.message,
    });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, category, author, excerpt, content, readTime, status } = req.body;

    const image = req.file ? `/uploads/${req.file.filename}` : undefined;
    const cleanSlug = slug ? slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-") : undefined;

    // Update in local memory
    const locIdx = localBlogs.findIndex((b) => String(b.id) === String(id));
    if (locIdx !== -1) {
      localBlogs[locIdx] = {
        ...localBlogs[locIdx],
        ...(title && { title }),
        ...(cleanSlug && { slug: cleanSlug }),
        ...(category && { category }),
        ...(author && { author }),
        ...(excerpt && { excerpt }),
        ...(content && { content }),
        ...(readTime && { readTime }),
        ...(status && { status }),
        ...(image && { image }),
      };
    }

    try {
      const [rows] = await db.query(
        "SELECT * FROM waqt_money_blogs WHERE id = ?",
        [id]
      );

      if (rows.length > 0) {
        const fields = ["title = ?", "slug = ?", "category = ?", "author = ?", "excerpt = ?", "content = ?", "status = ?"];
        const params = [
          title || rows[0].title,
          cleanSlug || rows[0].slug,
          category || rows[0].category,
          author || rows[0].author,
          excerpt || rows[0].excerpt,
          content || rows[0].content,
          status || rows[0].status || "ACTIVE",
        ];

        if (image !== undefined) {
          fields.push("image = ?");
          params.push(image);
        }

        params.push(id);

        await db.query(
          `UPDATE waqt_money_blogs SET ${fields.join(", ")} WHERE id = ?`,
          params
        );
      }
    } catch (dbErr) {
      // Ignored DB error fallback
    }

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating blog post",
      error: error.message,
    });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    localBlogs = localBlogs.filter((b) => String(b.id) !== String(id));

    try {
      await db.query("DELETE FROM waqt_money_blogs WHERE id = ?", [id]);
    } catch (dbErr) {
      // Ignored DB error fallback
    }

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting blog post",
      error: error.message,
    });
  }
};
