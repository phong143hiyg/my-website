const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/user_management';

if (!process.env.MONGODB_URI) {
    console.warn('Warning: MONGODB_URI is not defined in .env, using local fallback.');
}

// Kết nối MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Đã kết nối MongoDB thành công!'))
    .catch((err) => console.error('Lỗi kết nối DB:', err));

// Định nghĩa Schema & Model
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    age: { type: Number },
    address: { type: String }
});
const User = mongoose.model('User', userSchema);

// API 1: Lấy danh sách (Có phân trang + TÌM KIẾM)
app.get('/api/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5; 
        const search = req.query.search || ''; // Lấy từ khóa tìm kiếm
        const skip = (page - 1) * limit;

        // Tạo điều kiện tìm kiếm (Tìm theo Tên HOẶC Email, không phân biệt hoa thường)
        let query = {};
        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Lấy dữ liệu và đếm tổng số dựa trên điều kiện query
        const users = await User.find(query).skip(skip).limit(limit);
        const total = await User.countDocuments(query);

        res.json({ users, total, page, limit });
    } catch (err) {
        res.status(500).json({ message: "Lỗi Server", error: err.message });
    }
});

// API 2: Thêm mới người dùng
app.post('/api/users', async (req, res) => {
    try {
        const newUser = await User.create(req.body);
        res.status(201).json({ message: "Thêm thành công", data: newUser });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "email đã tồn tại" });
        }
        res.status(500).json({ message: "Lỗi Server", error: err.message });
    }
});

// API 3: Cập nhật người dùng (Sửa)
app.put('/api/users/:id', async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedUser) return res.status(404).json({ message: "Không tìm thấy người dùng" });
        res.json({ message: "Cập nhật thành công", data: updatedUser });
    } catch (err) {
        res.status(500).json({ message: "Lỗi Server", error: err.message });
    }
});

// API 4: Xóa người dùng
app.delete('/api/users/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: "Không tìm thấy người dùng" });
        res.json({ message: "Xóa thành công" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi Server", error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend đang chạy tại http://localhost:${PORT}`));