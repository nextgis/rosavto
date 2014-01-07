# **************************************************************************** 
# * Project:  ogr linear referencing utility
# * Purpose:  cmake script
# * Author:   Dmitry Baryshnikov (aka Bishop), polimax@mail.ru
# ****************************************************************************
# *   Copyright (C) 2014 NextGIS
# *
# *    This program is free software: you can redistribute it and/or modify
# *    it under the terms of the GNU General Public License as published by
# *    the Free Software Foundation, either version 3 of the License, or
# *    (at your option) any later version.
# *
# *    This program is distributed in the hope that it will be useful,
# *    but WITHOUT ANY WARRANTY; without even the implied warranty of
# *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# *    GNU General Public License for more details.
# *
# *    You should have received a copy of the GNU General Public License
# *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
# ****************************************************************************
cmake_minimum_required (VERSION 2.8)
 
set (APP_NAME "ogrlineref") 
 
project (${APP_NAME}) 

set(CMAKE_COLOR_MAKEFILE ON)

# set (HEADERS 
# )
 
set (SOURCES 
        ogrlineref.cpp)

find_package(GDAL REQUIRED)
if(GDAL_FOUND)
    include_directories(${GDAL_INCLUDE_DIR})
    include_directories(${GDAL_INCLUDE_DIR}/ogr)
    include_directories(${GDAL_INCLUDE_DIR}/ogr/ogrsf_frmts)
    include_directories(${GDAL_INCLUDE_DIR}/port)
    include_directories(${GDAL_INCLUDE_DIR}/gcore)
    include_directories(${GDAL_INCLUDE_DIR}/alg)
    include_directories(${GDAL_INCLUDE_DIR}/frmts/vrt)
endif(GDAL_FOUND)

add_executable(${APP_NAME} ${HEADERS} ${SOURCES})

target_link_libraries(${APP_NAME} ${GDAL_LIBRARY})

install(TARGETS ${APP_NAME}
    RUNTIME DESTINATION bin
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib)
