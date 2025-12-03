import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';

@Controller('models')
export class ModelsProxyController {
  
  private readonly HUGGINGFACE_BASE = 'https://huggingface.co/InventAgency/insightface-models/resolve/main';
  
  @Get('insightface/:filename')
  async getModel(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Solo permitir archivos .onnx específicos
    const allowedFiles = ['det_10g.onnx', 'w600k_r50.onnx'];
    
    if (!allowedFiles.includes(filename)) {
      return res.status(404).send('Model not found');
    }
    
    try {
      const url = `${this.HUGGINGFACE_BASE}/${filename}`;
      console.log(`📦 Proxy request for: ${filename}`);
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000, // 2 minutos para archivos grandes
      });
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 año
      res.send(response.data);
      
    } catch (error: any) {
      console.error(`❌ Error fetching model ${filename}:`, error.message);
      res.status(500).send('Error fetching model');
    }
  }
}
