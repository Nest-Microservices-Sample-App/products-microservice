import { HttpStatus, Injectable, Logger, NotFoundException, OnModuleInit, Param } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('ProductsService');

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to database');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {

    const { page = 1, limit = 10 } = paginationDto;

    const totalItems = await this.product.count({
      where: {
        isDeleted: false
      }
    });
    const lastPage = Math.ceil(totalItems / limit);

    const data = await this.product.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: {
        isDeleted: false
      }
    });

    return {
      data: data,
      metaData: {
        total: totalItems,
        currentPage: page,
        lastPage: lastPage,
        limit: limit
      }
    }
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({
      where: {
        id: id,
        isDeleted: false
      }
    });

    if (!product) {
      throw new RpcException({
        message: `Product with id ${id} not found`,
        status: HttpStatus.NOT_FOUND
      });
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {

    const { id: __, ...data } = updateProductDto;

    await this.findOne(id);

    return this.product.update({
      where: {
        id: id
      },
      data: data
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.product.update({
      where: {
        id: id
      },
      data: {
        isDeleted: true
      }
    })
  }

  async validateProducts(ids: number[]) {
    ids = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: {
        id: {
          in: ids
        },
        isDeleted: false
      }
    });

    if (products.length !== ids.length) {
      throw new RpcException({
        message: 'Some products were not found',
        status: HttpStatus.BAD_REQUEST
      });
    }

    return products;
  }
}
