import express  from "express"
import "dotenv/config"
import { clinicRouter } from "./routes/clinic.route.js";
import { connectDB } from "./config/db.js";
import cors from "cors"
const PORT =5000
const app = express()

app.use(cors({origin:"*"}));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/clinic",clinicRouter)


app.listen(PORT,()=>{
    console.log(`The server is running on port ${PORT}`)
    connectDB()
})