import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoryMapsService } from './story-maps.service';
import { CreateStoryMapDto } from './dto/create-story-map.dto';
import { UpdateStoryMapDto } from './dto/update-story-map.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('story-maps')
@Controller('story-maps')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class StoryMapsController {
  constructor(private readonly storyMapsService: StoryMapsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new story map' })
  create(@Body() createStoryMapDto: CreateStoryMapDto, @GetUser() user: User) {
    return this.storyMapsService.create(createStoryMapDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all story maps for current user' })
  findAll(@GetUser() user: User) {
    return this.storyMapsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single story map' })
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.storyMapsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a story map' })
  update(
    @Param('id') id: string,
    @Body() updateStoryMapDto: UpdateStoryMapDto,
    @GetUser() user: User,
  ) {
    return this.storyMapsService.update(id, updateStoryMapDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a story map (cascades to all child entities)' })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.storyMapsService.remove(id, user.id);
  }
}
