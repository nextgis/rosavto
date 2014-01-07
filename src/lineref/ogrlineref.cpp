/******************************************************************************
 * Project:  ogr linear referencing utility
 * Purpose:  cmake script
 * Author:   Dmitry Baryshnikov (aka Bishop), polimax@mail.ru
 *
 ******************************************************************************
 * Copyright (C) 2014 NextGIS
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 ****************************************************************************/

#include "ogrsf_frmts.h"
#include "ogr_p.h"
#include "cpl_conv.h"
#include "cpl_string.h"
#include "ogr_api.h"
#include "gdal.h"
#include "gdal_alg.h"
#include "commonutils.h"
#include <map>
#include <vector>

#define FIELD_START "beg"
#define FIELD_FINISH "end"
#define FIELD_SCALE_FACTOR "scale"

static void Usage(int bShort = TRUE);
static void Usage(const char* pszAdditionalMsg, int bShort = TRUE);

enum operation
{
    op_create = 1,
    op_get_pos,
    op_get_coord
};

typedef struct
{
    GIntBig      nFeaturesRead;
    int          bPerFeatureCT;
    OGRLayer    *poDstLayer;
    OGRCoordinateTransformation **papoCT; // size: poDstLayer->GetLayerDefn()->GetFieldCount();
    char       ***papapszTransformOptions; // size: poDstLayer->GetLayerDefn()->GetFieldCount();
    int         *panMap;
    int          iSrcZField;
    int          iRequestedSrcGeomField;
} TargetLayerInfo;

typedef struct
{
    OGRLayer         *poSrcLayer;
    TargetLayerInfo  *psInfo;
} AssociatedLayers;

static TargetLayerInfo* SetupTargetLayer( OGRDataSource *poSrcDS,
                                                OGRLayer * poSrcLayer,
                                                OGRDataSource *poDstDS,
                                                char **papszLCO,
                                                const char *pszNewLayerName,
                                                OGRSpatialReference *poOutputSRS,
                                                int bNullifyOutputSRS,
                                                char **papszSelFields,
                                                int bAppend, int bAddMissingFields, int eGType,
                                                int bPromoteToMulti,
                                                int nCoordDim, int bOverwrite,
                                                char** papszFieldTypesToString,
                                                int bUnsetFieldWidth,
                                                int bExplodeCollections,
                                                const char* pszZField,
                                                char **papszFieldMap,
                                                const char* pszWHERE,
                                                int bExactFieldNameMatch );

static void FreeTargetLayerInfo(TargetLayerInfo* psInfo);

static int TranslateLayer( TargetLayerInfo* psInfo,
                           OGRDataSource *poSrcDS,
                           OGRLayer * poSrcLayer,
                           OGRDataSource *poDstDS,
                           int bTransform,
                           int bWrapDateline,
                           const char* pszDateLineOffset,
                           OGRSpatialReference *poOutputSRS,
                           int bNullifyOutputSRS,
                           OGRSpatialReference *poUserSourceSRS,
                           OGRCoordinateTransformation *poGCPCoordTrans,
                           int eGType,
                           int bPromoteToMulti,
                           int nCoordDim,
                           GeomOperation eGeomOp,
                           double dfGeomOpParam,
                           long nCountLayerFeatures,
                           OGRGeometry* poClipSrc,
                           OGRGeometry *poClipDst,
                           int bExplodeCollections,
                           vsi_l_offset nSrcFileSize,
                           GIntBig* pnReadFeatureCount,
                           GDALProgressFunc pfnProgress,
                           void *pProgressArg);

/* -------------------------------------------------------------------- */
/*                  CheckDestDataSourceNameConsistency()                */
/* -------------------------------------------------------------------- */

static
void CheckDestDataSourceNameConsistency(const char* pszDestFilename,
                                        const char* pszDriverName)
{
    int i;
    char* pszDestExtension = CPLStrdup(CPLGetExtension(pszDestFilename));

    /* TODO: Would be good to have driver metadata like for GDAL drivers ! */
    static const char* apszExtensions[][2] = { { "shp"    , "ESRI Shapefile" },
                                               { "dbf"    , "ESRI Shapefile" },
                                               { "sqlite" , "SQLite" },
                                               { "db"     , "SQLite" },
                                               { "mif"    , "MapInfo File" },
                                               { "tab"    , "MapInfo File" },
                                               { "s57"    , "S57" },
                                               { "bna"    , "BNA" },
                                               { "csv"    , "CSV" },
                                               { "gml"    , "GML" },
                                               { "kml"    , "KML/LIBKML" },
                                               { "kmz"    , "LIBKML" },
                                               { "json"   , "GeoJSON" },
                                               { "geojson", "GeoJSON" },
                                               { "dxf"    , "DXF" },
                                               { "gdb"    , "FileGDB" },
                                               { "pix"    , "PCIDSK" },
                                               { "sql"    , "PGDump" },
                                               { "gtm"    , "GPSTrackMaker" },
                                               { "gmt"    , "GMT" },
                                               { "pdf"    , "PDF" },
                                               { NULL, NULL }
                                              };
    static const char* apszBeginName[][2] =  { { "PG:"      , "PG" },
                                               { "MySQL:"   , "MySQL" },
                                               { "CouchDB:" , "CouchDB" },
                                               { "GFT:"     , "GFT" },
                                               { "MSSQL:"   , "MSSQLSpatial" },
                                               { "ODBC:"    , "ODBC" },
                                               { "OCI:"     , "OCI" },
                                               { "SDE:"     , "SDE" },
                                               { "WFS:"     , "WFS" },
                                               { NULL, NULL }
                                             };

    for(i=0; apszExtensions[i][0] != NULL; i++)
    {
        if (EQUAL(pszDestExtension, apszExtensions[i][0]) && !EQUAL(pszDriverName, apszExtensions[i][1]))
        {
            fprintf(stderr,
                    "Warning: The target file has a '%s' extension, which is normally used by the %s driver,\n"
                    "but the requested output driver is %s. Is it really what you want ?\n",
                    pszDestExtension,
                    apszExtensions[i][1],
                    pszDriverName);
            break;
        }
    }

    for(i=0; apszBeginName[i][0] != NULL; i++)
    {
        if (EQUALN(pszDestFilename, apszBeginName[i][0], strlen(apszBeginName[i][0])) &&
            !EQUAL(pszDriverName, apszBeginName[i][1]))
        {
            fprintf(stderr,
                    "Warning: The target file has a name which is normally recognized by the %s driver,\n"
                    "but the requested output driver is %s. Is it really what you want ?\n",
                    apszBeginName[i][1],
                    pszDriverName);
            break;
        }
    }

    CPLFree(pszDestExtension);
}

/************************************************************************/
/*                           LoadGeometry()                             */
/************************************************************************/

static OGRGeometry* LoadGeometry( const char* pszDS,
                                  const char* pszSQL,
                                  const char* pszLyr,
                                  const char* pszWhere)
{
    OGRDataSource       *poDS;
    OGRLayer            *poLyr;
    OGRFeature          *poFeat;
    OGRGeometry         *poGeom = NULL;
        
    poDS = OGRSFDriverRegistrar::Open( pszDS, FALSE );
    if (poDS == NULL)
        return NULL;

    if (pszSQL != NULL)
        poLyr = poDS->ExecuteSQL( pszSQL, NULL, NULL ); 
    else if (pszLyr != NULL)
        poLyr = poDS->GetLayerByName(pszLyr);
    else
        poLyr = poDS->GetLayer(0);
        
    if (poLyr == NULL)
    {
        fprintf( stderr, "Failed to identify source layer from datasource.\n" );
        OGRDataSource::DestroyDataSource(poDS);
        return NULL;
    }
    
    if (pszWhere)
        poLyr->SetAttributeFilter(pszWhere);
        
    while ((poFeat = poLyr->GetNextFeature()) != NULL)
    {
        OGRGeometry* poSrcGeom = poFeat->GetGeometryRef();
        if (poSrcGeom)
        {
            OGRwkbGeometryType eType = wkbFlatten( poSrcGeom->getGeometryType() );
            
            if (poGeom == NULL)
                poGeom = OGRGeometryFactory::createGeometry( wkbMultiPolygon );

            if( eType == wkbPolygon )
                ((OGRGeometryCollection*)poGeom)->addGeometry( poSrcGeom );
            else if( eType == wkbMultiPolygon )
            {
                int iGeom;
                int nGeomCount = OGR_G_GetGeometryCount( (OGRGeometryH)poSrcGeom );

                for( iGeom = 0; iGeom < nGeomCount; iGeom++ )
                {
                    ((OGRGeometryCollection*)poGeom)->addGeometry(
                                ((OGRGeometryCollection*)poSrcGeom)->getGeometryRef(iGeom) );
                }
            }
            else
            {
                fprintf( stderr, "ERROR: Geometry not of polygon type.\n" );
                OGRGeometryFactory::destroyGeometry(poGeom);
                OGRFeature::DestroyFeature(poFeat);
                if( pszSQL != NULL )
                    poDS->ReleaseResultSet( poLyr );
                OGRDataSource::DestroyDataSource(poDS);
                return NULL;
            }
        }
    
        OGRFeature::DestroyFeature(poFeat);
    }
    
    if( pszSQL != NULL )
        poDS->ReleaseResultSet( poLyr );
    OGRDataSource::DestroyDataSource(poDS);
    
    return poGeom;
}

/************************************************************************/
/*                                main()                                */
/************************************************************************/

#define CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(nExtraArg) \
    do { if (iArg + nExtraArg >= nArgc) \
        Usage(CPLSPrintf("%s option requires %d argument(s)", papszArgv[iArg], nExtraArg)); } while(0)

int main( int nArgc, char ** papszArgv )

{
    int          nRetCode = 0;
    int          bQuiet = FALSE;
    const char  *pszFormat = "ESRI Shapefile";

    const char  *pszOutputDataSource = NULL;
    const char  *pszLineDataSource = NULL;
    const char  *pszPicketsDataSource = NULL;
    char  *pszOutputLayerName = NULL;
    const char  *pszLineLayerName = NULL;
    const char  *pszPicketsLayerName = NULL;
    const char  *pszPicketsMField = NULL;
    
    char        **papszDSCO = NULL, **papszLCO = NULL;
    
    const char  *pszOutputSRSDef = NULL;
    const char  *pszSourceSRSDef = NULL;
    OGRSpatialReference *poOutputSRS = NULL;
    int         bNullifyOutputSRS = FALSE;
    OGRSpatialReference *poSourceSRS = NULL;

    operation stOper = 0;
    double dfX(-100000000), dfY(-100000000), dfPos(-100000000);
    
    /* Check strict compilation and runtime library version as we use C++ API */
    if (! GDAL_CHECK_VERSION(papszArgv[0]))
        exit(1);

    EarlySetConfigOptions(nArgc, papszArgv);

/* -------------------------------------------------------------------- */
/*      Register format(s).                                             */
/* -------------------------------------------------------------------- */
    OGRRegisterAll();

/* -------------------------------------------------------------------- */
/*      Processing command line arguments.                              */
/* -------------------------------------------------------------------- */
    nArgc = OGRGeneralCmdLineProcessor( nArgc, &papszArgv, 0 );
    
    if( nArgc < 1 )
        exit( -nArgc );

    for( int iArg = 1; iArg < nArgc; iArg++ )
    {
        if( EQUAL(papszArgv[iArg], "--utility_version") )
        {
            printf("%s was compiled against GDAL %s and is running against GDAL %s\n",
                   papszArgv[0], GDAL_RELEASE_NAME, GDALVersionInfo("RELEASE_NAME"));
            return 0;
        }
        else if( EQUAL(papszArgv[iArg],"--help") )
            Usage();
        else if ( EQUAL(papszArgv[iArg], "--long-usage") )
        {
            Usage(FALSE);
        }

        else if( EQUAL(papszArgv[iArg],"-q") || EQUAL(papszArgv[iArg],"-quiet") )
        {
            bQuiet = TRUE;
        }
        else if( EQUAL(papszArgv[iArg],"-f") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            bFormatExplicitelySet = TRUE;
            pszFormat = papszArgv[++iArg];
        }
        else if( EQUAL(papszArgv[iArg],"-dsco") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            papszDSCO = CSLAddString(papszDSCO, papszArgv[++iArg] );
        }
        else if( EQUAL(papszArgv[iArg],"-lco") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            papszLCO = CSLAddString(papszLCO, papszArgv[++iArg] );
        }        
        else if( EQUAL(papszArgv[iArg],"-create") )
        {
            stOper = op_create;
        }
        else if( EQUAL(papszArgv[iArg],"-get_pos") )
        {
            stOper = op_get_pos;
        }        
        else if( EQUAL(papszArgv[iArg],"-get_coord") )
        {
            stOper = op_get_coord;
        }        
        else if( EQUAL(papszArgv[iArg],"-l") )
        {
             CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
           pszLineDataSource = papszArgv[++iArg];
        }        
        else if( EQUAL(papszArgv[iArg],"-ln") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            pszLineLayerName = papszArgv[++iArg];
        }         
        else if( EQUAL(papszArgv[iArg],"-p") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            pszLineDataSource = papszArgv[++iArg];
        }        
        else if( EQUAL(papszArgv[iArg],"-pn") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            pszLineLayerName = papszArgv[++iArg];
        }    
        else if( EQUAL(papszArgv[iArg],"-pm") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            pszPicketsMField = papszArgv[++iArg];
        }
        else if( EQUAL(papszArgv[iArg],"-o") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            pszLineDataSource = papszArgv[++iArg];
        }   
        else if( EQUAL(papszArgv[iArg],"-on") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            pszOutputLayerName = CPLStrdup(papszArgv[++iArg]);
        }        
        else if( EQUAL(papszArgv[iArg],"-x") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            dfX = atof(papszArgv[++iArg]);
        } 
        else if( EQUAL(papszArgv[iArg],"-y") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            dfY = atof(papszArgv[++iArg]);
        } 
        else if( EQUAL(papszArgv[iArg],"-m") )
        {
            CHECK_HAS_ENOUGH_ADDITIONAL_ARGS(1);
            dfPos = atof(papszArgv[++iArg]);
        }  
        else if( EQUAL(papszArgv[iArg],"-progress") )
        {
            bDisplayProgress = TRUE;
        }
        else if( papszArgv[iArg][0] == '-' )
        {
            Usage(CPLSPrintf("Unknown option name '%s'", papszArgv[iArg]));
        }
        else if( pszDestDataSource == NULL )
            pszDestDataSource = papszArgv[iArg];
        else if( pszDataSource == NULL )
            pszDataSource = papszArgv[iArg];
        else
            papszLayers = CSLAddString( papszLayers, papszArgv[iArg] );
    }

    OGRDataSource *poPkDS = NULL;
    
    if(stOper == op_create)
    {
        if( pszOutputDataSource == NULL)
            Usage("no output datasource provided");
        else if(pszLineDataSource == NULL)
            Usage("no path datasource provided");
        else  if(pszPicketsDataSource == NULL)
            Usage("no pickets datasource provided");
        else  if(pszPicketsMField == NULL)
            Usage("no position field provided");
            
    /* -------------------------------------------------------------------- */
    /*      Open data source.                                               */
    /* -------------------------------------------------------------------- */
        OGRDataSource       *poLnDS;
        OGRDataSource       *poODS = NULL;
        OGRSFDriver         *poDriver = NULL;

        poLnDS = OGRSFDriverRegistrar::Open( pszLineDataSource, FALSE );

    /* -------------------------------------------------------------------- */
    /*      Report failure                                                  */
    /* -------------------------------------------------------------------- */
        if( poLnDS == NULL )
        {
            OGRSFDriverRegistrar    *poR = OGRSFDriverRegistrar::GetRegistrar();
            
            fprintf( stderr, "FAILURE:\n"
                    "Unable to open path datasource `%s' with the following drivers.\n",
                    pszDataSource );

            for( int iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
            {
                fprintf( stderr, "  -> %s\n", poR->GetDriver(iDriver)->GetName() );
            }

            exit( 1 );
        }
        
        poPkDS = OGRSFDriverRegistrar::Open( pszPicketsDataSource, FALSE );
    /* -------------------------------------------------------------------- */
    /*      Report failure                                                  */
    /* -------------------------------------------------------------------- */
        if( poPkDS == NULL )
        {
            OGRSFDriverRegistrar    *poR = OGRSFDriverRegistrar::GetRegistrar();
            
            fprintf( stderr, "FAILURE:\n"
                    "Unable to open pickets datasource `%s' with the following drivers.\n",
                    pszDataSource );

            for( int iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
            {
                fprintf( stderr, "  -> %s\n", poR->GetDriver(iDriver)->GetName() );
            }

            exit( 1 );
        }
    
    
    /* -------------------------------------------------------------------- */
    /*      Find the output driver.                                         */
    /* -------------------------------------------------------------------- */

        if (!bQuiet)
            CheckDestDataSourceNameConsistency(pszOutputDataSource, pszFormat);

        OGRSFDriverRegistrar *poR = OGRSFDriverRegistrar::GetRegistrar();
        int                  iDriver;

        poDriver = poR->GetDriverByName(pszFormat);
        if( poDriver == NULL )
        {
            fprintf( stderr, "Unable to find driver `%s'.\n", pszFormat );
            fprintf( stderr,  "The following drivers are available:\n" );
        
            for( iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
            {
                fprintf( stderr,  "  -> `%s'\n", poR->GetDriver(iDriver)->GetName() );
            }
            exit( 1 );
        }

        if( !poDriver->TestCapability( ODrCCreateDataSource ) )
        {
            fprintf( stderr,  "%s driver does not support data source creation.\n",
                    pszFormat );
            exit( 1 );
        }

    /* -------------------------------------------------------------------- */
    /*      Create the output data source.                                  */
    /* -------------------------------------------------------------------- */
        poODS = poDriver->CreateDataSource( pszOutputDataSource, papszDSCO );
        if( poODS == NULL )
        {
            fprintf( stderr,  "%s driver failed to create %s\n", 
                    pszFormat, pszOutputDataSource );
            exit( 1 );
        }

        OGRLayer *poLnLayer, *poPkLayer, *poOutLayer;

        if(pszLineLayerName == NULL)
        {
            poLnLayer = poLnDS->GetLayerByName(pszLineLayerName);
        }
        else
        {
            poLnLayer = poLnDS->GetLayer(0);
        }
        
        if(poLnLayer == NULL)
        {
            fprintf( stderr, "Get path layer failed.\n" );
            exit( 1 );
        }   
        
        if(pszPicketsLayerName == NULL)
        {
            poPkLayer = poPkDS->GetLayerByName(pszPicketsLayerName);
        }
        else
        {
            poPkLayer = poPkDS->GetLayer(0);
        }
        
        if(poPkLayer == NULL)
        {
            fprintf( stderr, "Get pickets layer failed.\n" );
            exit( 1 );    
        }
                 
        OGRLayerDefn *poPkFDefn = poPkLayer->->GetLayerDefn();
        int nMValField = poPkFDefn->GetFieldIndex( pszPicketsMField );
        
        OGRLayer* poOutLayer = SetupTargetLayer(poLnLayer, poODS, papszLCO, pszOutputLayerName);
        if(poOutLayer == NULL)
        {
            fprintf( stderr, "Create output layer failed.\n" );
            exit( 1 );    
        }     
        
        //do the work
        nRetCode = CreateParts(poLnLayer, poPkLayer, nMValField, poOutLayer, bQuiet);
        
        //clean up        
        OGRDataSource::DestroyDataSource(poODS);
            
    }
    else if(stOper == op_get_pos)
    {
        if(pszPicketsDataSource == NULL)
            Usage("no pickets datasource provided");
        else if(dfX == -100000000 || dfY == -100000000)
            Usage("no coordinates provided");
            
        poPkDS = OGRSFDriverRegistrar::Open( pszPicketsDataSource, FALSE );
    /* -------------------------------------------------------------------- */
    /*      Report failure                                                  */
    /* -------------------------------------------------------------------- */
        if( poPkDS == NULL )
        {
            OGRSFDriverRegistrar    *poR = OGRSFDriverRegistrar::GetRegistrar();
            
            fprintf( stderr, "FAILURE:\n"
                    "Unable to open pickets datasource `%s' with the following drivers.\n",
                    pszDataSource );

            for( int iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
            {
                fprintf( stderr, "  -> %s\n", poR->GetDriver(iDriver)->GetName() );
            }

            exit( 1 );
        }
            
        if(pszPicketsLayerName == NULL)
        {
            poPkLayer = poPkDS->GetLayerByName(pszPicketsLayerName);
        }
        else
        {
            poPkLayer = poPkDS->GetLayer(0);
        }
        
        if(poPkLayer == NULL)
        {
            fprintf( stderr, "Get pickets layer failed.\n" );
            exit( 1 );    
        }  

        //do the work
        nRetCode = GetPosition(bQuiet);        
    }
    else if(stOper == op_get_coord)
    {
        if(pszPicketsDataSource == NULL)
            Usage("no pickets datasource provided");
        else if(dfPos == -100000000)
            Usage("no position provided");
            
        poPkDS = OGRSFDriverRegistrar::Open( pszPicketsDataSource, FALSE );
    /* -------------------------------------------------------------------- */
    /*      Report failure                                                  */
    /* -------------------------------------------------------------------- */
        if( poPkDS == NULL )
        {
            OGRSFDriverRegistrar    *poR = OGRSFDriverRegistrar::GetRegistrar();
            
            fprintf( stderr, "FAILURE:\n"
                    "Unable to open pickets datasource `%s' with the following drivers.\n",
                    pszDataSource );

            for( int iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
            {
                fprintf( stderr, "  -> %s\n", poR->GetDriver(iDriver)->GetName() );
            }

            exit( 1 );
        }
            
        if(pszPicketsLayerName == NULL)
        {
            poPkLayer = poPkDS->GetLayerByName(pszPicketsLayerName);
        }
        else
        {
            poPkLayer = poPkDS->GetLayer(0);
        }
        
        if(poPkLayer == NULL)
        {
            fprintf( stderr, "Get pickets layer failed.\n" );
            exit( 1 );    
        }     
        //do the work
        nRetCode = GetCoordinates(bQuiet);
    }
    else
    {
        Usage("no operation provided");
    }  
    
/* -------------------------------------------------------------------- */
/*      Close down.                                                     */
/* -------------------------------------------------------------------- */
    OGRDataSource::DestroyDataSource(poPkDS);

    CSLDestroy( papszArgv );
    CSLDestroy( papszDSCO );
    CSLDestroy( papszLCO );
    CPLFree( pszOutputLayerName );

    OGRCleanupAll();

#ifdef DBMALLOC
    malloc_dump(1);
#endif
    
    return nRetCode;
}

/************************************************************************/
/*                               Usage()                                */
/************************************************************************/

static void Usage(int bShort)
{
    Usage(NULL, bShort);
}

static void Usage(const char* pszAdditionalMsg, int bShort)

{
    OGRSFDriverRegistrar        *poR = OGRSFDriverRegistrar::GetRegistrar();


    printf( "Usage: ogrlineref [--help-general] [-progress] \n"
            "               [-f format_name] [[-dsco NAME=VALUE] ...] [[-lco NAME=VALUE]...]\n"
            "               [-create]\n"
            "               [-l src_line_datasource_name] [-ln name]\n"
            "               [-p src_pickets_datasource_name] [-pn name] [-pm pos_field_name]\n"
            "               [-o dst_datasource_name] [-on name]\n"
            "               [-get_pos] [-x long] [-y lat]\n"
            "               [-get_coord] [-m position] \n");

    if (bShort)
    {
        printf( "\nNote: ogrlineref --long-usage for full help.\n");
        if( pszAdditionalMsg )
            fprintf(stderr, "\nFAILURE: %s\n", pszAdditionalMsg);
        exit( 1 );
    }

    printf("\n -f format_name: output file format name, possible values are:\n");

    for( int iDriver = 0; iDriver < poR->GetDriverCount(); iDriver++ )
    {
        OGRSFDriver *poDriver = poR->GetDriver(iDriver);

        if( poDriver->TestCapability( ODrCCreateDataSource ) )
            printf( "     -f \"%s\"\n", poDriver->GetName() );
    }

    printf( " -progress: Display progress on terminal. Only works if input layers have the \n"
            "                                          \"fast feature count\" capability\n"
            " -dsco NAME=VALUE: Dataset creation option (format specific)\n"
            " -lco  NAME=VALUE: Layer creation option (format specific)\n"
            " -nln name: Assign an alternate name to the new layer");

    if( pszAdditionalMsg )
        fprintf(stderr, "\nFAILURE: %s\n", pszAdditionalMsg);

    exit( 1 );
}

//------------------------------------------------------------------------
// CreateParts
//------------------------------------------------------------------------
int CreateParts()
{
http://edndoc.esri.com/arcobjects/9.2/ComponentHelp/esriGeometry/ICurve_GetSubcurve.htm
    int          bDisplayProgress = FALSE;
    GDALProgressFunc pfnProgress = NULL;
    void        *pProgressArg = NULL;


    long nCountFeatures = 0;
    long nAccCountFeatures = 0;

        /* First pass to apply filters and count all features if necessary */
        for( iLayer = 0; 
            iLayer < nLayerCount; 
            iLayer++ )
        {
            OGRLayer        *poLayer = papoLayers[iLayer];
            if (poLayer == NULL)
                continue;

            if( pszWHERE != NULL )
            {
                if( poLayer->SetAttributeFilter( pszWHERE ) != OGRERR_NONE )
                {
                    fprintf( stderr, "FAILURE: SetAttributeFilter(%s) on layer '%s' failed.\n",
                             pszWHERE, poLayer->GetName() );
                    if (!bSkipFailures)
                        exit( 1 );
                }
            }

            ApplySpatialFilter(poLayer, poSpatialFilter, pszGeomField);

            if (bDisplayProgress && !bSrcIsOSM)
            {
                if (!poLayer->TestCapability(OLCFastFeatureCount))
                {
                    fprintf( stderr, "Progress turned off as fast feature count is not available.\n");
                    bDisplayProgress = FALSE;
                }
                else
                {
                    panLayerCountFeatures[iLayer] = poLayer->GetFeatureCount();
                    nCountLayersFeatures += panLayerCountFeatures[iLayer];
                }
            }
        }

        /* Second pass to do the real job */
        for( iLayer = 0; 
            iLayer < nLayerCount && nRetCode == 0; 
            iLayer++ )
        {
            OGRLayer        *poLayer = papoLayers[iLayer];
            if (poLayer == NULL)
                continue;


            OGRLayer* poPassedLayer = poLayer;
            if (bSplitListFields)
            {
                poPassedLayer = new OGRSplitListFieldLayer(poPassedLayer, nMaxSplitListSubFields);

                if (bDisplayProgress && nMaxSplitListSubFields != 1)
                {
                    pfnProgress = GDALScaledProgress;
                    pProgressArg = 
                        GDALCreateScaledProgress(nAccCountFeatures * 1.0 / nCountLayersFeatures,
                                                (nAccCountFeatures + panLayerCountFeatures[iLayer] / 2) * 1.0 / nCountLayersFeatures,
                                                GDALTermProgress,
                                                NULL);
                }
                else
                {
                    pfnProgress = NULL;
                    pProgressArg = NULL;
                }

                int nRet = ((OGRSplitListFieldLayer*)poPassedLayer)->BuildLayerDefn(pfnProgress, pProgressArg);
                if (!nRet)
                {
                    delete poPassedLayer;
                    poPassedLayer = poLayer;
                }

                if (bDisplayProgress)
                    GDALDestroyScaledProgress(pProgressArg);
            }


            if (bDisplayProgress)
            {
                if ( bSrcIsOSM )
                    pfnProgress = GDALTermProgress;
                else
                {
                    pfnProgress = GDALScaledProgress;
                    int nStart = 0;
                    if (poPassedLayer != poLayer && nMaxSplitListSubFields != 1)
                        nStart = panLayerCountFeatures[iLayer] / 2;
                    pProgressArg =
                        GDALCreateScaledProgress((nAccCountFeatures + nStart) * 1.0 / nCountLayersFeatures,
                                                (nAccCountFeatures + panLayerCountFeatures[iLayer]) * 1.0 / nCountLayersFeatures,
                                                GDALTermProgress,
                                                NULL);
                }
            }

            nAccCountFeatures += panLayerCountFeatures[iLayer];

            TargetLayerInfo* psInfo = SetupTargetLayer( poDS,
                                                poPassedLayer,
                                                poODS,
                                                papszLCO,
                                                pszNewLayerName,
                                                poOutputSRS,
                                                bNullifyOutputSRS,
                                                papszSelFields,
                                                bAppend, bAddMissingFields, eGType,
                                                bPromoteToMulti,
                                                nCoordDim, bOverwrite,
                                                papszFieldTypesToString,
                                                bUnsetFieldWidth,
                                                bExplodeCollections,
                                                pszZField,
                                                papszFieldMap,
                                                pszWHERE,
						bExactFieldNameMatch );

            poPassedLayer->ResetReading();

            if( (psInfo == NULL ||
                !TranslateLayer( psInfo, poDS, poPassedLayer, poODS,
                                  bTransform, bWrapDateline, pszDateLineOffset,
                                  poOutputSRS, bNullifyOutputSRS,
                                  poSourceSRS,
                                  poGCPCoordTrans,
                                  eGType, bPromoteToMulti, nCoordDim,
                                  eGeomOp, dfGeomOpParam,
                                  panLayerCountFeatures[iLayer],
                                  poClipSrc, poClipDst,
                                  bExplodeCollections,
                                  nSrcFileSize, NULL,
                                  pfnProgress, pProgressArg ))
                && !bSkipFailures )
            {
                CPLError( CE_Failure, CPLE_AppDefined, 
                        "Terminating translation prematurely after failed\n"
                        "translation of layer %s (use -skipfailures to skip errors)\n", 
                        poLayer->GetName() );

                nRetCode = 1;
            }

            FreeTargetLayerInfo(psInfo);

            if (poPassedLayer != poLayer)
                delete poPassedLayer;

            if (bDisplayProgress && !bSrcIsOSM)
                GDALDestroyScaledProgress(pProgressArg);
        }

        CPLFree(panLayerCountFeatures);
        CPLFree(papoLayers);
    }
    
    
    /* Destroy them after the last potential user */
    OGRSpatialReference::DestroySpatialReference(poOutputSRS);
    OGRSpatialReference::DestroySpatialReference(poSourceSRS);

}

//------------------------------------------------------------------------
// GetPosition
//------------------------------------------------------------------------
int GetPosition()
{
}

//------------------------------------------------------------------------
// GetCoordinates
//------------------------------------------------------------------------
int GetCoordinates()
{
}

/************************************************************************/
/*                         SetupTargetLayer()                           */
/************************************************************************/

static OGRLayer* SetupTargetLayer(OGRLayer * poSrcLayer,
                                                OGRDataSource *poDstDS,
                                                char **papszLCO,
                                                const char *pszNewLayerName )
{
    OGRLayer    *poDstLayer;
    OGRFeatureDefn *poSrcFDefn;
    OGRFeatureDefn *poDstFDefn = NULL;
    OGRSpatialReference *poOutputSRS;
    
    if( pszNewLayerName == NULL )
        pszNewLayerName = poSrcLayer->GetName(); //TODO: add _parts

/* -------------------------------------------------------------------- */
/*      Get other info.                                                 */
/* -------------------------------------------------------------------- */
    poSrcFDefn = poSrcLayer->GetLayerDefn();

/* -------------------------------------------------------------------- */
/*      Find requested geometry fields.                                 */
/* -------------------------------------------------------------------- */
    
    poOutputSRS = poSrcLayer->GetSpatialRef();

/* -------------------------------------------------------------------- */
/*      Find the layer.                                                 */
/* -------------------------------------------------------------------- */

    /* GetLayerByName() can instanciate layers that would have been */
    /* 'hidden' otherwise, for example, non-spatial tables in a */
    /* Postgis-enabled database, so this apparently useless command is */
    /* not useless... (#4012) */
    CPLPushErrorHandler(CPLQuietErrorHandler);
    poDstLayer = poDstDS->GetLayerByName(pszNewLayerName);
    CPLPopErrorHandler();
    CPLErrorReset();

    int iLayer = -1;
    if (poDstLayer != NULL)
    {
        int nLayerCount = poDstDS->GetLayerCount();
        for( iLayer = 0; iLayer < nLayerCount; iLayer++ )
        {
            OGRLayer        *poLayer = poDstDS->GetLayer(iLayer);
            if (poLayer == poDstLayer)
                break;
        }

        if (iLayer == nLayerCount)
            /* shouldn't happen with an ideal driver */
            poDstLayer = NULL;
    }

/* -------------------------------------------------------------------- */
/*      If the layer does not exist, then create it.                    */
/* -------------------------------------------------------------------- */
    if( poDstLayer == NULL )
    {
        if( !poDstDS->TestCapability( ODsCCreateLayer ) )
        {
            fprintf( stderr,
              "Layer %s not found, and CreateLayer not supported by driver.\n",
                     pszNewLayerName );
            return NULL;
        }

        OGRwkbGeometryType eGType = wkbLineString;

        CPLErrorReset();

        if( poDstDS->TestCapability(ODsCCreateGeomFieldAfterCreateLayer) )
        {
            eGType = wkbNone;
        }

        poDstLayer = poDstDS->CreateLayer( pszNewLayerName, poOutputSRS,
                                           (OGRwkbGeometryType) eGType,
                                           papszLCO );

        if( poDstLayer == NULL )
            return NULL;

        if( poDstDS->TestCapability(ODsCCreateGeomFieldAfterCreateLayer)) )
        {
            OGRGeomFieldDefn oGFldDefn(poSrcFDefn->GetGeomFieldDefn(iSrcGeomField));
            if( poOutputSRS != NULL )
                oGFldDefn.SetSpatialRef(poOutputSRS);
            oGFldDefn.SetType(wkbLineString);
            poDstLayer->CreateGeomField(&oGFldDefn);
        }
    }

/* -------------------------------------------------------------------- */
/*      Otherwise we will append to it, if append was requested.        */
/* -------------------------------------------------------------------- */
    else
    {
        fprintf( stderr, "FAILED: Layer %s already exists.\n",
                pszNewLayerName );
        return NULL;
    }

//create beg, end, scale factor fields
                OGRFieldDefn* poSrcFieldDefn = poSrcFDefn->GetFieldDefn(iSrcField);
                OGRFieldDefn oFieldDefn( poSrcFieldDefn );
                    oFieldDefn.SetType(OFTString);
                    oFieldDefn.SetWidth(0);
                    oFieldDefn.SetPrecision(0);
if (poDstLayer->CreateField( &oFieldDefn ) == OGRERR_NONE)
                {
                    /* now that we've created a field, GetLayerDefn() won't return NULL */
                    if (poDstFDefn == NULL)
                        poDstFDefn = poDstLayer->GetLayerDefn();

                    /* Sanity check : if it fails, the driver is buggy */
                    if (poDstFDefn != NULL &&
                        poDstFDefn->GetFieldCount() != nDstFieldCount + 1)
                    {
                        CPLError(CE_Warning, CPLE_AppDefined,
                                 "The output driver has claimed to have added the %s field, but it did not!",
                                 oFieldDefn.GetNameRef() );
                    }
                }
            }
        }

    return poDstLayer;
}


/************************************************************************/
/*                           TranslateLayer()                           */
/************************************************************************/

static int TranslateLayer( TargetLayerInfo* psInfo,
                           OGRDataSource *poSrcDS,
                           OGRLayer * poSrcLayer,
                           OGRDataSource *poDstDS,
                           int bTransform,
                           int bWrapDateline,
                           const char* pszDateLineOffset,
                           OGRSpatialReference *poOutputSRS,
                           int bNullifyOutputSRS,
                           OGRSpatialReference *poUserSourceSRS,
                           OGRCoordinateTransformation *poGCPCoordTrans,
                           int eGType,
                           int bPromoteToMulti,
                           int nCoordDim,
                           GeomOperation eGeomOp,
                           double dfGeomOpParam,
                           long nCountLayerFeatures,
                           OGRGeometry* poClipSrc,
                           OGRGeometry *poClipDst,
                           int bExplodeCollections,
                           vsi_l_offset nSrcFileSize,
                           GIntBig* pnReadFeatureCount,
                           GDALProgressFunc pfnProgress,
                           void *pProgressArg )

{
    OGRLayer    *poDstLayer;
    int         bForceToPolygon = FALSE;
    int         bForceToMultiPolygon = FALSE;
    int         bForceToMultiLineString = FALSE;
    int         *panMap = NULL;
    int         iSrcZField;

    poDstLayer = psInfo->poDstLayer;
    panMap = psInfo->panMap;
    iSrcZField = psInfo->iSrcZField;
    int nSrcGeomFieldCount = poSrcLayer->GetLayerDefn()->GetGeomFieldCount();
    int nDstGeomFieldCount = poDstLayer->GetLayerDefn()->GetGeomFieldCount();

    if( poOutputSRS == NULL && !bNullifyOutputSRS )
    {
        if( nSrcGeomFieldCount == 1 )
        {
            poOutputSRS = poSrcLayer->GetSpatialRef();
        }
        else if( psInfo->iRequestedSrcGeomField > 0 )
        {
            poOutputSRS = poSrcLayer->GetLayerDefn()->GetGeomFieldDefn(
                psInfo->iRequestedSrcGeomField)->GetSpatialRef();
        }

    }
    
    if( wkbFlatten(eGType) == wkbPolygon )
        bForceToPolygon = TRUE;
    else if( wkbFlatten(eGType) == wkbMultiPolygon )
        bForceToMultiPolygon = TRUE;
    else if( wkbFlatten(eGType) == wkbMultiLineString )
        bForceToMultiLineString = TRUE;
    
    if( bExplodeCollections && nDstGeomFieldCount > 1 )
    {
        bExplodeCollections = FALSE;
    }

/* -------------------------------------------------------------------- */
/*      Transfer features.                                              */
/* -------------------------------------------------------------------- */
    OGRFeature  *poFeature;
    int         nFeaturesInTransaction = 0;
    GIntBig      nCount = 0; /* written + failed */
    GIntBig      nFeaturesWritten = 0;

    if( nGroupTransactions )
        poDstLayer->StartTransaction();

    while( TRUE )
    {
        OGRFeature      *poDstFeature = NULL;

        if( nFIDToFetch != OGRNullFID )
        {
            // Only fetch feature on first pass.
            if( nFeaturesInTransaction == 0 )
                poFeature = poSrcLayer->GetFeature(nFIDToFetch);
            else
                poFeature = NULL;
        }
        else
            poFeature = poSrcLayer->GetNextFeature();

        if( poFeature == NULL )
            break;

        if( psInfo->nFeaturesRead == 0 || psInfo->bPerFeatureCT )
        {
            if( !SetupCT( psInfo, poSrcLayer, bTransform, bWrapDateline,
                          pszDateLineOffset, poUserSourceSRS,
                          poFeature, poOutputSRS, poGCPCoordTrans) )
            {
                OGRFeature::DestroyFeature( poFeature );
                return FALSE;
            }
        }

        psInfo->nFeaturesRead ++;

        int nParts = 0;
        int nIters = 1;
        if (bExplodeCollections)
        {
            OGRGeometry* poSrcGeometry;
            if( psInfo->iRequestedSrcGeomField >= 0 )
                poSrcGeometry = poFeature->GetGeomFieldRef(
                                        psInfo->iRequestedSrcGeomField);
            else
                poSrcGeometry = poFeature->GetGeometryRef();
            if (poSrcGeometry)
            {
                switch (wkbFlatten(poSrcGeometry->getGeometryType()))
                {
                    case wkbMultiPoint:
                    case wkbMultiLineString:
                    case wkbMultiPolygon:
                    case wkbGeometryCollection:
                        nParts = ((OGRGeometryCollection*)poSrcGeometry)->getNumGeometries();
                        nIters = nParts;
                        if (nIters == 0)
                            nIters = 1;
                    default:
                        break;
                }
            }
        }

        for(int iPart = 0; iPart < nIters; iPart++)
        {
            if( ++nFeaturesInTransaction == nGroupTransactions )
            {
                poDstLayer->CommitTransaction();
                poDstLayer->StartTransaction();
                nFeaturesInTransaction = 0;
            }

            CPLErrorReset();
            poDstFeature = OGRFeature::CreateFeature( poDstLayer->GetLayerDefn() );

            /* Optimization to avoid duplicating the source geometry in the */
            /* target feature : we steal it from the source feature for now... */
            OGRGeometry* poStolenGeometry = NULL;
            if( !bExplodeCollections && nSrcGeomFieldCount == 1 &&
                nDstGeomFieldCount == 1 )
            {
                poStolenGeometry = poFeature->StealGeometry();
            }
            else if( !bExplodeCollections &&
                     psInfo->iRequestedSrcGeomField >= 0 )
            {
                poStolenGeometry = poFeature->StealGeometry(
                    psInfo->iRequestedSrcGeomField);
            }

            if( poDstFeature->SetFrom( poFeature, panMap, TRUE ) != OGRERR_NONE )
            {
                if( nGroupTransactions )
                    poDstLayer->CommitTransaction();

                CPLError( CE_Failure, CPLE_AppDefined,
                        "Unable to translate feature %ld from layer %s.\n",
                        poFeature->GetFID(), poSrcLayer->GetName() );

                OGRFeature::DestroyFeature( poFeature );
                OGRFeature::DestroyFeature( poDstFeature );
                OGRGeometryFactory::destroyGeometry( poStolenGeometry );
                return FALSE;
            }

            /* ... and now we can attach the stolen geometry */
            if( poStolenGeometry )
            {
                poDstFeature->SetGeometryDirectly(poStolenGeometry);
            }

            if( bPreserveFID )
                poDstFeature->SetFID( poFeature->GetFID() );
            
            for( int iGeom = 0; iGeom < nDstGeomFieldCount; iGeom ++ )
            {
                OGRGeometry* poDstGeometry = poDstFeature->GetGeomFieldRef(iGeom);
                if (poDstGeometry == NULL)
                    continue;

                if (nParts > 0)
                {
                    /* For -explodecollections, extract the iPart(th) of the geometry */
                    OGRGeometry* poPart = ((OGRGeometryCollection*)poDstGeometry)->getGeometryRef(iPart);
                    ((OGRGeometryCollection*)poDstGeometry)->removeGeometry(iPart, FALSE);
                    poDstFeature->SetGeomFieldDirectly(iGeom, poPart);
                    poDstGeometry = poPart;
                }

                if (iSrcZField != -1)
                {
                    SetZ(poDstGeometry, poFeature->GetFieldAsDouble(iSrcZField));
                    /* This will correct the coordinate dimension to 3 */
                    OGRGeometry* poDupGeometry = poDstGeometry->clone();
                    poDstFeature->SetGeomFieldDirectly(iGeom, poDupGeometry);
                    poDstGeometry = poDupGeometry;
                }

                if (nCoordDim == 2 || nCoordDim == 3)
                    poDstGeometry->setCoordinateDimension( nCoordDim );
                else if ( nCoordDim == COORD_DIM_LAYER_DIM )
                    poDstGeometry->setCoordinateDimension(
                        (poDstLayer->GetLayerDefn()->GetGeomFieldDefn(iGeom)->GetType() & wkb25DBit) ? 3 : 2 );

                if (eGeomOp == SEGMENTIZE)
                {
                    if (dfGeomOpParam > 0)
                        poDstGeometry->segmentize(dfGeomOpParam);
                }
                else if (eGeomOp == SIMPLIFY_PRESERVE_TOPOLOGY)
                {
                    if (dfGeomOpParam > 0)
                    {
                        OGRGeometry* poNewGeom = poDstGeometry->SimplifyPreserveTopology(dfGeomOpParam);
                        if (poNewGeom)
                        {
                            poDstFeature->SetGeomFieldDirectly(iGeom, poNewGeom);
                            poDstGeometry = poNewGeom;
                        }
                    }
                }

                if (poClipSrc)
                {
                    OGRGeometry* poClipped = poDstGeometry->Intersection(poClipSrc);
                    if (poClipped == NULL || poClipped->IsEmpty())
                    {
                        OGRGeometryFactory::destroyGeometry(poClipped);
                        goto end_loop;
                    }
                    poDstFeature->SetGeomFieldDirectly(iGeom, poClipped);
                    poDstGeometry = poClipped;
                }
                
                OGRCoordinateTransformation* poCT = psInfo->papoCT[iGeom];
                if( !bTransform )
                    poCT = poGCPCoordTrans;
                char** papszTransformOptions = psInfo->papapszTransformOptions[iGeom];

                if( poCT != NULL || papszTransformOptions != NULL)
                {
                    OGRGeometry* poReprojectedGeom =
                        OGRGeometryFactory::transformWithOptions(poDstGeometry, poCT, papszTransformOptions);
                    if( poReprojectedGeom == NULL )
                    {
                        if( nGroupTransactions )
                            poDstLayer->CommitTransaction();

                        fprintf( stderr, "Failed to reproject feature %d (geometry probably out of source or destination SRS).\n",
                                (int) poFeature->GetFID() );
                        if( !bSkipFailures )
                        {
                            OGRFeature::DestroyFeature( poFeature );
                            OGRFeature::DestroyFeature( poDstFeature );
                            return FALSE;
                        }
                    }

                    poDstFeature->SetGeomFieldDirectly(iGeom, poReprojectedGeom);
                    poDstGeometry = poReprojectedGeom;
                }
                else if (poOutputSRS != NULL)
                {
                    poDstGeometry->assignSpatialReference(poOutputSRS);
                }

                if (poClipDst)
                {
                    OGRGeometry* poClipped = poDstGeometry->Intersection(poClipDst);
                    if (poClipped == NULL || poClipped->IsEmpty())
                    {
                        OGRGeometryFactory::destroyGeometry(poClipped);
                        goto end_loop;
                    }

                    poDstFeature->SetGeomFieldDirectly(iGeom, poClipped);
                    poDstGeometry = poClipped;
                }

                if( bForceToPolygon )
                {
                    poDstFeature->SetGeomFieldDirectly(iGeom, 
                        OGRGeometryFactory::forceToPolygon(
                            poDstFeature->StealGeometry(iGeom) ) );
                }
                else if( bForceToMultiPolygon ||
                        (bPromoteToMulti && wkbFlatten(poDstGeometry->getGeometryType()) == wkbPolygon) )
                {
                    poDstFeature->SetGeomFieldDirectly(iGeom, 
                        OGRGeometryFactory::forceToMultiPolygon(
                            poDstFeature->StealGeometry(iGeom) ) );
                }
                else if ( bForceToMultiLineString ||
                        (bPromoteToMulti && wkbFlatten(poDstGeometry->getGeometryType()) == wkbLineString) )
                {
                    poDstFeature->SetGeomFieldDirectly(iGeom, 
                        OGRGeometryFactory::forceToMultiLineString(
                            poDstFeature->StealGeometry(iGeom) ) );
                }
            }

            CPLErrorReset();
            if( poDstLayer->CreateFeature( poDstFeature ) == OGRERR_NONE )
            {
                nFeaturesWritten ++;
            }
            else if( !bSkipFailures )
            {
                if( nGroupTransactions )
                    poDstLayer->RollbackTransaction();

                CPLError( CE_Failure, CPLE_AppDefined,
                        "Unable to write feature %ld from layer %s.\n",
                        poFeature->GetFID(), poSrcLayer->GetName() );

                OGRFeature::DestroyFeature( poFeature );
                OGRFeature::DestroyFeature( poDstFeature );
                return FALSE;
            }
            else
            {
                CPLDebug( "OGR2OGR", "Unable to write feature %ld into layer %s.\n",
                           poFeature->GetFID(), poSrcLayer->GetName() );
            }

end_loop:
            OGRFeature::DestroyFeature( poDstFeature );
        }

        OGRFeature::DestroyFeature( poFeature );

        /* Report progress */
        nCount ++;
        if (pfnProgress)
        {
            if (nSrcFileSize != 0)
            {
                if ((nCount % 1000) == 0)
                {
                    OGRLayer* poFCLayer = poSrcDS->ExecuteSQL("GetBytesRead()", NULL, NULL);
                    if( poFCLayer != NULL )
                    {
                        OGRFeature* poFeat = poFCLayer->GetNextFeature();
                        if( poFeat )
                        {
                            const char* pszReadSize = poFeat->GetFieldAsString(0);
                            GUIntBig nReadSize = CPLScanUIntBig( pszReadSize, 32 );
                            pfnProgress(nReadSize * 1.0 / nSrcFileSize, "", pProgressArg);
                            OGRFeature::DestroyFeature( poFeat );
                        }
                    }
                    poSrcDS->ReleaseResultSet(poFCLayer);
                }
            }
            else
            {
                pfnProgress(nCount * 1.0 / nCountLayerFeatures, "", pProgressArg);
            }
        }

        if (pnReadFeatureCount)
            *pnReadFeatureCount = nCount;
    }

    if( nGroupTransactions )
        poDstLayer->CommitTransaction();

    CPLDebug("OGR2OGR", CPL_FRMT_GIB " features written in layer '%s'",
             nFeaturesWritten, poDstLayer->GetName());

    return TRUE;
}

